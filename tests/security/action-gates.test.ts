import fs from "node:fs";
import path from "node:path";
import { describe, expect, it } from "vitest";

const ROOT = process.cwd();

const PROTECTED_ACTION_FILES = [
  "app/admin/access/actions.ts",
  "app/admin/competitions/actions.ts",
  "app/admin/divisions/actions.ts",
  "app/admin/groups/actions.ts",
  "app/admin/invitations/actions.ts",
  "app/admin/lineups/[id]/actions.ts",
  "app/admin/matches/actions.ts",
  "app/admin/organizations/actions.ts",
  "app/admin/roles/actions.ts",
  "app/admin/seasons/actions.ts",
  "app/admin/stages/actions.ts",
  "app/admin/teams/actions.ts",
  "app/admin/teams/[id]/actions.ts",
  "app/admin/users/actions.ts",
  "app/admin/users/[userId]/actions.ts",
  "app/admin/venues/actions.ts",
  "app/live/[matchId]/actions.ts",
  "app/select-workspace/actions.ts",
  "app/team/[token]/actions.ts",
  "app/team/[token]/(coach)/profile/actions.ts",
];

describe("server action authorization", () => {
  it.each(PROTECTED_ACTION_FILES)("%s contains an explicit authorization gate", (relativePath) => {
    const source = fs.readFileSync(path.join(ROOT, relativePath), "utf8");
    expect(source).toMatch(
      /requireAdmin|requireFoundationAccess|requireRole|requireCoach|getSessionUser/
    );
  });

  it("scopes live event mutations to both event and match", () => {
    const source = fs.readFileSync(
      path.join(ROOT, "app/live/[matchId]/actions.ts"),
      "utf8"
    );
    expect(source.match(/\.eq\("match_id", matchId\)/g)?.length).toBeGreaterThanOrEqual(4);
  });

  it("authenticates the service-role live API before reading data", () => {
    const source = fs.readFileSync(
      path.join(ROOT, "app/api/live/[matchId]/route.ts"),
      "utf8"
    );
    expect(source).toContain("auth.auth.getUser()");
    expect(source).toContain('status: 401');
    expect(source).toContain('status: 403');
  });
});
