import fs from "node:fs";
import path from "node:path";
import { describe, expect, it } from "vitest";

const ROOT = process.cwd();

describe("Competition Completion — matches wired to the hierarchy (Sprint 2)", () => {
  it("migration 008 adds all five hierarchy/venue columns, all nullable", () => {
    const sql = fs.readFileSync(path.join(ROOT, "supabase/migrations/008_competition_completion.sql"), "utf8");
    for (const column of ["season_id", "division_id", "stage_id", "group_id", "venue_id"]) {
      expect(sql).toContain(`add column if not exists ${column} uuid references`);
    }
    // None of these are "not null" — a match can still be created with
    // zero hierarchy/venue information, exactly as before this migration.
    // (Checked on the column-definition line specifically — the trigger
    // logic below legitimately contains phrases like "is not null" that
    // aren't a table constraint.)
    for (const column of ["season_id", "division_id", "stage_id", "group_id", "venue_id"]) {
      const columnLine = sql.split("\n").find((line) => line.includes(`add column if not exists ${column} `));
      expect(columnLine).toBeTruthy();
      expect(columnLine).not.toMatch(/\bnot null\b/);
    }
  });

  it("the hierarchy-consistency trigger both validates and backfills ancestors", () => {
    const sql = fs.readFileSync(path.join(ROOT, "supabase/migrations/008_competition_completion.sql"), "utf8");
    expect(sql).toContain("check_match_hierarchy_consistency");
    expect(sql).toContain("matches_check_hierarchy");
    // Backfill: setting the most specific level should populate its ancestors.
    expect(sql).toContain("new.stage_id := v_group_stage_id");
    expect(sql).toContain("new.division_id := v_stage_division_id");
    expect(sql).toContain("new.season_id := v_division_season_id");
    expect(sql).toContain("new.competition_id := v_season_competition_id");
  });

  it("lib/types.ts Match type carries the new optional hierarchy fields", () => {
    const source = fs.readFileSync(path.join(ROOT, "lib/types.ts"), "utf8");
    for (const field of ["season_id?: string | null", "division_id?: string | null", "stage_id?: string | null", "group_id?: string | null", "venue_id?: string | null"]) {
      expect(source).toContain(field);
    }
  });

  it("createMatch passes the hierarchy fields through to the insert and handles a save failure", () => {
    const source = fs.readFileSync(path.join(ROOT, "app/admin/matches/actions.ts"), "utf8");
    for (const field of ["season_id", "division_id", "stage_id", "group_id", "venue_id"]) {
      expect(source).toContain(field);
    }
    // A trigger-rejected hierarchy (mismatched nesting) must surface as a
    // real error, not fail silently.
    expect(source).toMatch(/if \(error\)/);
    expect(source).toContain("save-failed");
  });

  it("the admin Matches page offers a cascading hierarchy picker, not five independent selects", () => {
    const source = fs.readFileSync(path.join(ROOT, "components/foundation/MatchHierarchyFields.tsx"), "utf8");
    expect(source).toContain('"use client"');
    // Each level's options are actually filtered by its parent's selection.
    expect(source).toContain("seasons.filter((s) => s.competition_id === competitionId)");
    expect(source).toContain("divisions.filter((d) => d.season_id === seasonId)");
    expect(source).toContain("stages.filter((s) => s.division_id === divisionId)");
    expect(source).toContain("groups.filter((g) => g.stage_id === stageId)");
  });
});
