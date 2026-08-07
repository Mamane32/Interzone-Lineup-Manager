import fs from "node:fs";
import path from "node:path";
import { describe, expect, it } from "vitest";

const ROOT = process.cwd();

const FOUNDATION_ACTION_FILES = [
  "app/admin/competitions/actions.ts",
  "app/admin/organizations/actions.ts",
  "app/admin/seasons/actions.ts",
  "app/admin/divisions/actions.ts",
  "app/admin/stages/actions.ts",
  "app/admin/groups/actions.ts",
  "app/admin/venues/actions.ts",
];

describe("Foundation CRUD revalidation (Sprint 1 closure — Critical #2)", () => {
  it.each(FOUNDATION_ACTION_FILES)(
    "%s revalidates through the shared revalidateFoundation() helper, not a narrow revalidatePath() call",
    (relativePath) => {
      const source = fs.readFileSync(path.join(ROOT, relativePath), "utf8");
      // The bug: each entity's mutations only revalidated their own admin
      // page, leaving every other page's dropdown of that entity stale
      // until a hard refresh. The fix has to live in one shared helper, not
      // be re-applied per file, or it will silently regress the next time
      // someone copies one of these files for a new entity.
      expect(source).toContain("revalidateFoundation");
      expect(source).not.toMatch(/\brevalidatePath\(/);
    }
  );

  it("the shared helper itself revalidates the whole route tree, not one path", () => {
    const source = fs.readFileSync(path.join(ROOT, "lib/foundation.ts"), "utf8");
    expect(source).toContain('revalidatePath("/", "layout")');
  });
});

describe("Server/client module boundary (Sprint 1 closure — deriveLiveAlerts regression)", () => {
  it("lib/live-alerts.ts has no \"use client\" directive, so Server Components can call its exports directly", () => {
    // Regression guard for tonight's "deriveLiveAlerts is not a function"
    // bug: a Server Component (BroadcastHeader) called a plain function
    // that lived in a "use client" file. Next's RSC compiler replaces every
    // export of a "use client" module with a client-reference proxy for
    // Server Components — calling one directly throws exactly that error,
    // in every environment, not just as a cache artifact. The fix moved the
    // pure function to this directive-free module; this test keeps it there.
    const source = fs.readFileSync(path.join(ROOT, "lib/live-alerts.ts"), "utf8");
    expect(source).not.toMatch(/^["']use client["'];?/m);
  });

  it("BroadcastHeader imports deriveLiveAlerts from the shared lib, not from the client component file", () => {
    const source = fs.readFileSync(path.join(ROOT, "components/live/BroadcastHeader.tsx"), "utf8");
    expect(source).toMatch(/from ["']@\/lib\/live-alerts["']/);
  });
});

describe("Server/client module boundary (Sprint 3 acceptance — EVENT_META/minuteSort regression)", () => {
  it("lib/event-meta.ts has no \"use client\" directive, so Server Components can read/call its exports directly", () => {
    // Regression guard for the Public Match Center and match report page
    // crashing ("Cannot access second_yellow.tone on the server" /
    // "minuteSort is not a function") — both read a data property or called
    // a function that lived in components/live/MatchTimelineEvent.tsx and
    // components/live/Timeline.tsx, both "use client". Same root cause as
    // the deriveLiveAlerts regression above: Next's RSC compiler replaces
    // every export of a "use client" module with a client-reference proxy
    // for Server Components. The fix moved EVENT_META and minuteSort to
    // this directive-free module; this test keeps them there.
    const source = fs.readFileSync(path.join(ROOT, "lib/event-meta.ts"), "utf8");
    expect(source).not.toMatch(/^["']use client["'];?/m);
    expect(source).toContain("export const EVENT_META");
    expect(source).toContain("export function minuteSort");
  });

  it("the public Match Center and match report page import EVENT_META/minuteSort from the shared lib, not a client component file", () => {
    const publicMatchSource = fs.readFileSync(path.join(ROOT, "app/match/[matchId]/page.tsx"), "utf8");
    const reportSource = fs.readFileSync(path.join(ROOT, "app/live/[matchId]/report/page.tsx"), "utf8");
    expect(publicMatchSource).toMatch(/EVENT_META.*from ["']@\/lib\/event-meta["']/);
    expect(reportSource).toMatch(/EVENT_META.*minuteSort.*from ["']@\/lib\/event-meta["']|minuteSort.*EVENT_META.*from ["']@\/lib\/event-meta["']/);
  });
});

describe("Modal consolidation (Sprint 1 closure — High #3)", () => {
  it("components/foundation/Modal.tsx and components/live/Modal.tsx both delegate to the shared components/ui/Modal.tsx", () => {
    for (const relativePath of ["components/foundation/Modal.tsx", "components/live/Modal.tsx"]) {
      const source = fs.readFileSync(path.join(ROOT, relativePath), "utf8");
      expect(source, `${relativePath} should re-export the shared Modal instead of reimplementing the overlay`).toMatch(
        /from ["']@\/components\/ui\/Modal["']/
      );
    }
  });

  it("components/iam/ConfirmActionDialog.tsx composes the shared Modal instead of an inline overlay", () => {
    const source = fs.readFileSync(path.join(ROOT, "components/iam/ConfirmActionDialog.tsx"), "utf8");
    expect(source).toMatch(/from ["']@\/components\/ui\/Modal["']/);
    // The bug: three independent hand-written overlays had already drifted
    // in accessibility attributes. Guard the specific drift that was found.
    expect(source).toMatch(/role="alertdialog"/);
  });
});

describe("schema.sql stays in sync with the real tables (Sprint 1 closure — High #5)", () => {
  // Every table any migration creates. Not derived from schema.sql itself
  // (that would make this test unable to catch schema.sql going stale) —
  // this list is the ground truth, read from the migration files instead.
  const TABLES_FROM_MIGRATIONS = [
    "competitions", "teams", "players", "matches", "lineups", // schema.sql baseline
    "match_events", // 002
    "profiles", "user_access_assignments", // 003
    "invitations", "audit_logs", "role_metadata", // 004
    "organizations", "seasons", "divisions", "stages", "competition_groups", "venues", // 006
    "tactical_formations", "tactical_positions", // 007
  ];

  it("supabase/schema.sql documents every table that exists across all migrations", () => {
    const source = fs.readFileSync(path.join(ROOT, "supabase/schema.sql"), "utf8");
    for (const table of TABLES_FROM_MIGRATIONS) {
      expect(source, `schema.sql is missing table "${table}" — it has gone stale again, regenerate it`).toMatch(
        new RegExp(`create table if not exists ${table}\\b`)
      );
    }
  });
});

describe("Broadcast Integration Layer stays the single mediator (production-system provider abstraction)", () => {
  // The regression this guards: BroadcastEngine/BroadcastSystemEngine (the
  // provider abstraction — vMix today, OBS/Ross/Vizrt/CasparCG later) already
  // existed, but five call sites reached past it straight into
  // lib/vmix/client's getVMixStatus() — one vMix-specific system baked
  // directly into UI/session code, the exact coupling the abstraction exists
  // to prevent. Only lib/broadcast/VMixEngine.ts (the vMix *implementation*
  // of the provider interface) may import lib/vmix/client — every other
  // caller must go through BroadcastEngine.getSystemStatus()/getSystemsStatus(),
  // so adding a second provider (OBS) never requires touching UI/session code.
  const ALLOWED_VMIX_CLIENT_IMPORTERS = ["lib/vmix/client.ts", "lib/broadcast/VMixEngine.ts"];

  it("only lib/broadcast/VMixEngine.ts imports lib/vmix/client outside the client itself", () => {
    function findTsFiles(dir: string): string[] {
      const results: string[] = [];
      for (const entry of fs.readdirSync(path.join(ROOT, dir), { withFileTypes: true })) {
        const rel = path.join(dir, entry.name);
        if (entry.isDirectory()) {
          if (entry.name === "node_modules" || entry.name === ".next") continue;
          results.push(...findTsFiles(rel));
        } else if (/\.(ts|tsx)$/.test(entry.name)) {
          results.push(rel);
        }
      }
      return results;
    }

    const offenders: string[] = [];
    for (const dir of ["app", "components", "lib"]) {
      for (const relativePath of findTsFiles(dir)) {
        if (ALLOWED_VMIX_CLIENT_IMPORTERS.includes(relativePath)) continue;
        const source = fs.readFileSync(path.join(ROOT, relativePath), "utf8");
        if (/from ["']@\/lib\/vmix\/client["']/.test(source)) offenders.push(relativePath);
      }
    }
    expect(offenders, "these files bypass the Broadcast Integration Layer by importing lib/vmix/client directly — use BroadcastEngine.getSystemStatus(\"vmix\") instead").toEqual([]);
  });

  it("BroadcastEngine exposes a provider-agnostic status lookup callers use instead of naming vMix", () => {
    const source = fs.readFileSync(path.join(ROOT, "lib/broadcast/BroadcastEngine.ts"), "utf8");
    expect(source).toContain("getSystemStatus");
    // The registry itself is still allowed to name concrete systems — this
    // guards that callers of the layer don't have to.
    expect(source).toContain("REGISTERED_SYSTEMS");
  });
});
