import type { MatchEvent, MatchLiveStatus } from "./types";

/** Splits a stored minute string ("45+2") into its base and stoppage parts. Shared by every reader of event.minute so there's one parser, not several. */
function parseMinute(minute: string): { base: number; extra: number | null } {
  const [base, extra] = minute.split("+");
  return { base: Number(base), extra: extra ? Number(extra) : null };
}

function latestEventMinute(events: MatchEvent[]): { base: number; extra: number | null } | null {
  const latest = [...events].sort((a, b) => (a.created_at < b.created_at ? -1 : 1)).at(-1);
  return latest ? parseMinute(latest.minute) : null;
}

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
  const latest = latestEventMinute(events);
  const base = latest ? String(latest.base) : null;
  const extra = latest?.extra != null ? String(latest.extra) : null;

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

/**
 * The raw minute VALUE (not a display label) an operator most likely means
 * by "right now" — the "Current Minute" preset's default, and what a new
 * event dialog pre-selects on open so logging something that's happening
 * *right now* takes zero clicks, not one. Returns null for states with no
 * meaningful continuous minute to suggest (pre-match, half-time, full-time,
 * penalties) — the picker falls back to its fixed presets or Custom there.
 */
export function deriveCurrentMinuteValue(status: MatchLiveStatus, events: MatchEvent[]): string | null {
  const latest = latestEventMinute(events);

  switch (status) {
    case "pre_match":
    case "half_time":
    case "full_time":
    case "penalty_shootout":
      return null;
    case "kickoff":
      return "0";
    case "second_half":
      return latest ? formatMinute(latest) : "45";
    case "extra_time":
      return latest ? formatMinute(latest) : "90";
    case "first_half":
    default:
      return latest ? formatMinute(latest) : "0";
  }
}

function formatMinute(m: { base: number; extra: number | null }): string {
  return m.extra != null ? `${m.base}+${m.extra}` : String(m.base);
}

/**
 * Adds N minutes to a minute value for the picker's "+1/+2/+3/+5" presets.
 * Once a minute is already in stoppage-time notation ("45+1"), "+N more"
 * means more added time at the same base (-> "45+4"), not a new base
 * minute — that's how an operator actually thinks about it, and the only
 * rule simple enough to be predictable at a glance.
 */
export function addMinutes(minute: string, delta: number): string {
  const { base, extra } = parseMinute(minute);
  if (extra != null) return `${base}+${extra + delta}`;
  return String(base + delta);
}
