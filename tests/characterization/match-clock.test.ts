import { describe, expect, it } from "vitest";
import { addMinutes, deriveCurrentMinuteValue, deriveMatchClock } from "@/lib/match-clock";
import type { MatchEvent } from "@/lib/types";

function event(minute: string, createdAt: string): MatchEvent {
  return {
    id: `${minute}-${createdAt}`,
    match_id: "match-1",
    minute,
    type: "goal",
    team_id: "team-1",
    player_id: "player-1",
    description: null,
    created_at: createdAt,
  };
}

describe("deriveMatchClock characterization", () => {
  it.each([
    ["pre_match", "—"],
    ["kickoff", "0'"],
    ["half_time", "HT"],
    ["full_time", "FT"],
    ["penalty_shootout", "PEN"],
  ] as const)("renders the fixed %s label", (status, minuteLabel) => {
    expect(deriveMatchClock(status, [])).toEqual({
      minuteLabel,
      additionalTimeLabel: null,
    });
  });

  it("uses the chronologically latest event and preserves stoppage time", () => {
    const events = [
      event("45+2", "2026-07-30T12:02:00.000Z"),
      event("12", "2026-07-30T12:01:00.000Z"),
    ];

    expect(deriveMatchClock("first_half", events)).toEqual({
      minuteLabel: "45'",
      additionalTimeLabel: "+2",
    });
  });

  it("keeps the existing empty-state defaults for active halves", () => {
    expect(deriveMatchClock("first_half", [])).toEqual({
      minuteLabel: "0'",
      additionalTimeLabel: null,
    });
    expect(deriveMatchClock("second_half", [])).toEqual({
      minuteLabel: "45'",
      additionalTimeLabel: null,
    });
  });
});

describe("deriveCurrentMinuteValue", () => {
  it.each([
    ["pre_match", null],
    ["half_time", null],
    ["full_time", null],
    ["penalty_shootout", null],
    ["kickoff", "0"],
  ] as const)("returns %s -> %s regardless of events", (status, expected) => {
    expect(deriveCurrentMinuteValue(status, [])).toBe(expected);
  });

  it("falls back to the half's nominal start when there is no event yet", () => {
    expect(deriveCurrentMinuteValue("first_half", [])).toBe("0");
    expect(deriveCurrentMinuteValue("second_half", [])).toBe("45");
    expect(deriveCurrentMinuteValue("extra_time", [])).toBe("90");
  });

  it("uses the latest event's minute, preserving stoppage-time notation", () => {
    const events = [
      event("12", "2026-07-30T12:01:00.000Z"),
      event("45+2", "2026-07-30T12:02:00.000Z"),
    ];
    expect(deriveCurrentMinuteValue("first_half", events)).toBe("45+2");
  });

  it("picks the chronologically latest event, not the last array entry", () => {
    const events = [
      event("45+2", "2026-07-30T12:02:00.000Z"),
      event("12", "2026-07-30T12:01:00.000Z"),
    ];
    expect(deriveCurrentMinuteValue("first_half", events)).toBe("45+2");
  });
});

describe("addMinutes", () => {
  it("adds to a plain base minute", () => {
    expect(addMinutes("37", 3)).toBe("40");
  });

  it("adds to the stoppage-time component once already in added time, not the base", () => {
    expect(addMinutes("45+1", 3)).toBe("45+4");
  });

  it("treats a base minute with no stoppage-time component as a plain add, even at 90", () => {
    expect(addMinutes("90", 5)).toBe("95");
  });
});
