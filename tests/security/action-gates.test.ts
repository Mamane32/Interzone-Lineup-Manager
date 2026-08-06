import fs from "node:fs";
import path from "node:path";
import { describe, expect, it } from "vitest";

const ROOT = process.cwd();

/**
 * Every Server Action file that intentionally has no requireAdmin/
 * requireRole/requireFoundationAccess/requireCoach call, because it IS a
 * pre-authentication flow (no session exists yet to check a role against)
 * or performs its own inline ownership check instead of calling a named
 * guard. Anything not listed here must call a recognized guard or this
 * suite fails the build — a new action file can no longer ship unguarded
 * without either adding the gate or explaining itself here.
 *
 * This exists because the Enterprise Readiness Review found the previous
 * version of this test used a hand-maintained allowlist of protected files
 * (rather than scanning app/ itself) that had already silently drifted:
 * app/admin/settings/actions.ts calls requireAdmin() in real code but was
 * never added to the list, so a regression there would have gone
 * undetected. Scanning the filesystem directly closes that gap for good.
 */
const EXEMPT_ACTION_FILES: Record<string, string> = {
  "app/admin/login/actions.ts": "pre-authentication: this IS the admin login flow — no session exists yet",
  "app/login/actions.ts": "pre-authentication: this IS the unified login flow — no session exists yet",
  "app/team/[token]/login/actions.ts":
    "pre-authentication: signs the coach in, then inline-checks team ownership (assignment or legacy coach_email match) itself before granting access — same authorization outcome as requireCoach(), applied manually because no session exists until after signInWithPassword() succeeds",
  "app/team/[token]/forgot-password/actions.ts": "pre-authentication: password reset request — no session exists yet",
  "app/team/reset-password/actions.ts": "pre-authentication: completes a reset via an emailed code — no session exists yet",
  "app/select-workspace/actions.ts":
    "any authenticated user may call this by design (it's how a multi-role user picks a workspace); it validates the chosen assignment belongs to the session user itself via getSessionUser()+getActiveAssignments() rather than requiring one fixed role",
  "app/admin/brand-studio/actions.ts":
    "gated by requirePlatformBrandingWrite() from lib/branding-permissions.ts, a purpose-built check for the two-level (Platform Owner / Competition Administrator) branding permission model — equivalent in strictness to requireAdmin(), just not one of the four generically-named gates this scan looks for.",
};

/** Recursively finds every actions.ts file under a directory. */
function findActionFiles(dir: string): string[] {
  const results: string[] = [];
  for (const entry of fs.readdirSync(dir, { withFileTypes: true })) {
    const full = path.join(dir, entry.name);
    if (entry.isDirectory()) {
      results.push(...findActionFiles(full));
    } else if (entry.name === "actions.ts") {
      results.push(full);
    }
  }
  return results;
}

const ACTION_FILES = findActionFiles(path.join(ROOT, "app")).map((f) =>
  path.relative(ROOT, f).split(path.sep).join("/")
);

describe("server action authorization coverage", () => {
  it("actually finds action files (sanity check the scan itself isn't silently empty)", () => {
    expect(ACTION_FILES.length).toBeGreaterThanOrEqual(20);
  });

  it("every exemption still points at a real file (no stale exemptions)", () => {
    for (const relativePath of Object.keys(EXEMPT_ACTION_FILES)) {
      expect(
        fs.existsSync(path.join(ROOT, relativePath)),
        `${relativePath} is listed in EXEMPT_ACTION_FILES but no longer exists — remove the stale entry`
      ).toBe(true);
    }
  });

  it.each(ACTION_FILES)("%s calls a recognized authorization gate, or is explicitly exempt with a reason", (relativePath) => {
    if (relativePath in EXEMPT_ACTION_FILES) return;
    const source = fs.readFileSync(path.join(ROOT, relativePath), "utf8");
    const hasGate = /\brequire(Admin|FoundationAccess|Role|Coach)\s*\(/.test(source);
    expect(
      hasGate,
      `${relativePath} has no requireAdmin/requireRole/requireFoundationAccess/requireCoach() call and is not in EXEMPT_ACTION_FILES. Either add the missing gate, or add this file to EXEMPT_ACTION_FILES with a reason if it's genuinely pre-authentication.`
    ).toBe(true);
  });

  it("scopes live event mutations to both event and match", () => {
    const source = fs.readFileSync(path.join(ROOT, "app/live/[matchId]/actions.ts"), "utf8");
    expect(source.match(/\.eq\("match_id", matchId\)/g)?.length).toBeGreaterThanOrEqual(4);
  });

  it("restricts saving a formation to admin/super_admin only — Broadcast is strictly read-only", () => {
    const source = fs.readFileSync(path.join(ROOT, "app/live/[matchId]/formation/actions.ts"), "utf8");
    expect(source).toMatch(/requireRole\(\["admin", "super_admin"\]\)/);
    // The comment explaining WHY broadcast_operator is absent is fine —
    // what matters is that it never appears inside an actual requireRole(...) call.
    expect(source).not.toMatch(/requireRole\(\[[^\]]*broadcast_operator/);
    expect(source).toContain("home_team_id !== teamId && match.away_team_id !== teamId");
  });

  it("still lets Broadcast view the Tactical Formation Panel — the page gate is broader than the save gate", () => {
    const source = fs.readFileSync(path.join(ROOT, "app/live/[matchId]/formation/page.tsx"), "utf8");
    expect(source).toMatch(/requireRole\(\["broadcast_operator", "admin", "super_admin"\]\)/);
    expect(source).toContain('role !== "broadcast_operator"');
  });

  it("never references the Formation Engine at all from truly public routes", () => {
    // Unlike the Coach Portal (see below), these surfaces have no
    // legitimate reason to touch formation code at all — not even the
    // shared engine.
    const publicSurfaces = ["app/api", "app/page.tsx", "app/(marketing)"].filter((p) => fs.existsSync(path.join(ROOT, p)));
    for (const surface of publicSurfaces) {
      const files = fs.statSync(path.join(ROOT, surface)).isDirectory()
        ? fs.readdirSync(path.join(ROOT, surface), { recursive: true }).filter((f): f is string => typeof f === "string" && /\.(ts|tsx)$/.test(f))
        : [path.basename(surface)];
      for (const file of files) {
        const fullPath = fs.statSync(path.join(ROOT, surface)).isDirectory() ? path.join(ROOT, surface, file) : path.join(ROOT, surface);
        if (!fs.statSync(fullPath).isFile()) continue;
        const source = fs.readFileSync(fullPath, "utf8");
        expect(source).not.toMatch(/tactical-formation|formation-engine|formation\/actions/);
      }
    }
  });

  it("Coach Portal is a real Formation Engine consumer, but never imports Admin/Broadcast's own action file or shell", () => {
    // Since Phase 3, the Coach Portal legitimately calls the shared engine
    // (lib/tactical-formation, lib/formation-engine) through its OWN
    // permission-boundary action (app/team/[token]/actions.ts's
    // saveTeamFormation) — that's the whole point of one role-agnostic
    // engine with multiple thin permission boundaries. What it must never
    // do is reach into Admin/Broadcast's action file (which requires
    // admin/super_admin) or their presentation-only shell components.
    const files = fs
      .readdirSync(path.join(ROOT, "app/team"), { recursive: true })
      .filter((f): f is string => typeof f === "string" && /\.(ts|tsx)$/.test(f));

    for (const file of files) {
      const fullPath = path.join(ROOT, "app/team", file);
      if (!fs.statSync(fullPath).isFile()) continue;
      const source = fs.readFileSync(fullPath, "utf8");
      expect(source).not.toMatch(/from ["']@\/app\/live\/\[matchId\]\/formation\/actions["']/);
      expect(source).not.toMatch(/TacticalFormationBoard|PresetManager|FormationVisualizations|FormationAnimationPreview|VMixExportPreview/);
    }
  });

  it("authenticates the service-role live API before reading data", () => {
    const source = fs.readFileSync(path.join(ROOT, "app/api/live/[matchId]/route.ts"), "utf8");
    expect(source).toContain("auth.auth.getUser()");
    expect(source).toContain('status: 401');
    expect(source).toContain('status: 403');
  });

  it("authenticates the production queue polling API the same way", () => {
    const source = fs.readFileSync(path.join(ROOT, "app/api/live/[matchId]/production-queue/route.ts"), "utf8");
    expect(source).toContain("auth.auth.getUser()");
    expect(source).toContain('status: 401');
    expect(source).toContain('status: 403');
  });

  it("gates both broadcast output pages (Program/Preview) behind the same broadcast role check", () => {
    for (const mode of ["program", "preview"]) {
      const source = fs.readFileSync(path.join(ROOT, `app/broadcast-output/[matchId]/${mode}/page.tsx`), "utf8");
      expect(source).toMatch(/requireRole\(\["broadcast_operator", "admin", "super_admin"\]\)/);
    }
  });
});
