import type { MatchEvent, MatchLiveStatus } from "./types";

/**
 * There's no stored kickoff timestamp (adding one would be a schema change
 * this sprint avoids, and a truly live-ticking clock would be "backend
 * automation," which the brief explicitly excludes). Instead, the
 * displayed clock/minute is derived from data that already exists: the
 * match's live_status and the most recent timeline event's minute
 * notation (which already supports "45+2" style stoppage time).
 */
export function deriveMatchClock(
  status: MatchLiveStatus,
  events: MatchEvent[]
): { minuteLabel: string; additionalTimeLabel: string | null } {
  const latest = [...events].sort((a, b) => (a.created_at < b.created_at ? -1 : 1)).at(-1);
  const [base, extra] = latest ? latest.minute.split("+") : [null, null];

  switch (status) {
    case "pre_match":
      return { minuteLabel: "—", additionalTimeLabel: null };
    case "kickoff":
      return { minuteLabel: "0'", additionalTimeLabel: null };
    case "half_time":
      return { minuteLabel: "HT", additionalTimeLabel: null };
    case "full_time":
      return { minuteLabel: "FT", additionalTimeLabel: null };
    case "penalty_shootout":
      return { minuteLabel: "PEN", additionalTimeLabel: null };
    case "extra_time":
      return {
        minuteLabel: base ? `${base}'` : "90'+",
        additionalTimeLabel: extra ? `+${extra}` : null,
      };
    case "first_half":
    case "second_half":
    default:
      return {
        minuteLabel: base ? `${base}'` : status === "second_half" ? "45'" : "0'",
        additionalTimeLabel: extra ? `+${extra}` : null,
      };
  }
}
