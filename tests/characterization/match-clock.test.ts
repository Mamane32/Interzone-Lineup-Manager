import { describe, expect, it } from "vitest";
import { deriveMatchClock } from "@/lib/match-clock";
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
