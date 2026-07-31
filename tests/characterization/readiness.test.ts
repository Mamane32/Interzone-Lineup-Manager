import { describe, expect, it } from "vitest";
import { buildReadinessReport, teamReadinessFromData, type TeamReadinessInput } from "@/lib/readiness";

const COMPLETE_TEAM: TeamReadinessInput = {
  lineupSubmitted: true,
  hasFormation: true,
  positionCount: 11,
  hasCaptain: true,
  hasGoalkeeper: true,
  substituteCount: 5,
};

const EMPTY_TEAM: TeamReadinessInput = {
  lineupSubmitted: false,
  hasFormation: false,
  positionCount: 0,
  hasCaptain: false,
  hasGoalkeeper: false,
  substituteCount: 0,
};

describe("buildReadinessReport", () => {
  it("scores 100% and is Ready when both teams and both integrations are fully complete", () => {
    const report = buildReadinessReport({
      competitionId: "comp-1",
      refereeName: "J. Louis",
      home: COMPLETE_TEAM,
      away: COMPLETE_TEAM,
      vmixConnected: true,
      websiteSyncConnected: true,
    });

    expect(report.scorePercent).toBe(100);
    expect(report.matchdayStatus).toBe("ready");
    expect(report.checks.every((c) => c.status !== "warning")).toBe(true);
  });

  it("excludes not_tracked checks (Broadcast Graphics, Sponsor Graphics) from the score denominator", () => {
    const report = buildReadinessReport({
      competitionId: "comp-1",
      refereeName: "J. Louis",
      home: COMPLETE_TEAM,
      away: COMPLETE_TEAM,
      vmixConnected: true,
      websiteSyncConnected: true,
    });

    const notTracked = report.checks.filter((c) => c.status === "not_tracked");
    expect(notTracked.map((c) => c.id)).toEqual(["broadcast_graphics_ready", "sponsor_graphics_ready"]);
    expect(report.trackedCount).toBe(report.checks.length - notTracked.length);
    // A 100% score with not_tracked items excluded proves they aren't
    // silently counted as failures either.
    expect(report.scorePercent).toBe(100);
  });

  it("requires BOTH teams to satisfy a per-team check, not just one", () => {
    const report = buildReadinessReport({
      competitionId: "comp-1",
      refereeName: "J. Louis",
      home: COMPLETE_TEAM,
      away: EMPTY_TEAM,
      vmixConnected: true,
      websiteSyncConnected: true,
    });

    const startingXi = report.checks.find((c) => c.id === "starting_xi_submitted");
    expect(startingXi?.status).toBe("warning");
    expect(startingXi?.warningLabel).toBe("Starting XI Incomplete");
  });

  it("flags unconfigured integrations without claiming a false pass", () => {
    const report = buildReadinessReport({
      competitionId: null,
      refereeName: null,
      home: EMPTY_TEAM,
      away: EMPTY_TEAM,
      vmixConnected: false,
      websiteSyncConnected: false,
    });

    expect(report.checks.find((c) => c.id === "vmix_configuration_ready")?.status).toBe("warning");
    expect(report.checks.find((c) => c.id === "website_sync_ready")?.status).toBe("warning");
    expect(report.matchdayStatus).toBe("not_ready");
  });

  it("classifies matchday status by score thresholds", () => {
    const attention = buildReadinessReport({
      competitionId: "comp-1",
      refereeName: "J. Louis",
      home: COMPLETE_TEAM,
      away: COMPLETE_TEAM,
      vmixConnected: false,
      websiteSyncConnected: true,
    });
    expect(attention.scorePercent).toBeLessThan(100);
    expect(attention.scorePercent).toBeGreaterThanOrEqual(75);
    expect(attention.matchdayStatus).toBe("attention");
  });
});

describe("GO LIVE gate", () => {
  it("blocks Go Live when a critical check fails even if the overall score is high", () => {
    // Every check passes except goalkeeper_verified (critical) — score is
    // high (18/19 trackable ~ 94%, "attention"), but Go Live must still be
    // blocked because a critical requirement is unmet.
    const almostComplete: TeamReadinessInput = { ...COMPLETE_TEAM, hasGoalkeeper: false };
    const report = buildReadinessReport({
      competitionId: "comp-1",
      refereeName: "J. Louis",
      home: almostComplete,
      away: COMPLETE_TEAM,
      vmixConnected: true,
      websiteSyncConnected: true,
    });

    expect(report.canGoLive).toBe(false);
    expect(report.blockingChecks.map((c) => c.id)).toEqual(["goalkeeper_verified"]);
    expect(report.scorePercent).toBeGreaterThan(0);
  });

  it("allows Go Live once every critical check passes, even if non-critical items (vMix/Website Sync) are incomplete", () => {
    const report = buildReadinessReport({
      competitionId: "comp-1",
      refereeName: "J. Louis",
      home: COMPLETE_TEAM,
      away: COMPLETE_TEAM,
      vmixConnected: false,
      websiteSyncConnected: false,
    });

    expect(report.canGoLive).toBe(true);
    expect(report.blockingChecks).toEqual([]);
    expect(report.scorePercent).toBeLessThan(100);
  });

  it("every blocking check carries an actionable fix — the operator is never left without a next step", () => {
    const report = buildReadinessReport({
      competitionId: null,
      refereeName: null,
      home: EMPTY_TEAM,
      away: EMPTY_TEAM,
      vmixConnected: false,
      websiteSyncConnected: false,
    });

    for (const check of report.blockingChecks) {
      expect(check.actionLabel).toBeTruthy();
      expect(check.actionHref?.("match-1")).toMatch(/^\//);
    }
  });
});

describe("teamReadinessFromData", () => {
  it("derives captain/goalkeeper presence from the actual positions array, not a flag", () => {
    const input = teamReadinessFromData({
      lineupStatus: "submitted",
      formation: { id: "f1", match_id: "m1", team_id: "t1", formation: "4-4-2", created_at: "", updated_at: "" },
      positions: [
        {
          id: "p1",
          tactical_formation_id: "f1",
          player_id: "player-1",
          tactical_position: "GK",
          x_coordinate: 50,
          y_coordinate: 8,
          shirt_number: 1,
          captain: false,
          goalkeeper: true,
          created_at: "",
          updated_at: "",
        },
      ],
      substituteCount: 3,
    });

    expect(input.hasGoalkeeper).toBe(true);
    expect(input.hasCaptain).toBe(false);
    expect(input.positionCount).toBe(1);
  });
});
