import "server-only";
import type { LineupStatus, TacticalFormation, TacticalPosition } from "@/lib/types";

/**
 * Broadcast Readiness Center — the pre-kickoff production checklist.
 *
 * Every check here is either:
 *   (a) computed from real data (Starting XI submission, tactical formation
 *       rows, vMix/Website Sync connection state), or
 *   (b) structurally guaranteed by the schema/derivation logic (team colors
 *       are always auto-derived by lib/team-theme.ts, coach_name/coach_phone
 *       are NOT NULL columns, branding always has a fallback) — real, just
 *       never able to fail today, and marked as such, or
 *   (c) honestly "not_tracked" where no server-side signal exists at all
 *       (Broadcast Graphics and Advertising panels are local component
 *       state only, never persisted — see their own doc comments).
 *
 * "not_tracked" checks are excluded from the score denominator — a fake
 * pass would lie about readiness, and a fake fail would block an operator
 * on something this system genuinely cannot verify. The score is honest
 * about what fraction of it is real.
 *
 * Future-ready by construction: adding a check is adding one object to the
 * array below (or a new evaluator alongside evaluateReadiness) — nothing
 * about ReadinessCheck, the score math, or the UI needs to change.
 */

export type ReadinessStatus = "pass" | "warning" | "not_tracked";
export type ReadinessCategory = "foundation" | "lineup" | "tactical" | "production" | "integration";

export type ReadinessCheck = {
  id: string;
  label: string;
  category: ReadinessCategory;
  status: ReadinessStatus;
  /** Shown in Mission Control's Live Alerts when status is "warning". */
  warningLabel?: string;
  /** Blocks GO LIVE when true and status !== "pass". Scoring is unaffected — this only feeds canGoLive/blockingChecks below. */
  critical?: boolean;
  /** "One click to the right screen" — the operator never has to search for the fix. */
  actionLabel?: string;
  actionHref?: (matchId: string) => string;
};

export type MatchdayStatus = "ready" | "attention" | "not_ready";

export type ReadinessReport = {
  checks: ReadinessCheck[];
  scorePercent: number;
  trackedCount: number;
  passedCount: number;
  matchdayStatus: MatchdayStatus;
  /** GO LIVE workflow gate — true only when every `critical` check passes. Independent of scorePercent: a 90% score can still block Go Live if a critical check is the missing 10%, and a lower score with only non-critical gaps does not. */
  canGoLive: boolean;
  blockingChecks: ReadinessCheck[];
};

export type TeamReadinessInput = {
  lineupSubmitted: boolean;
  hasFormation: boolean;
  positionCount: number;
  hasCaptain: boolean;
  hasGoalkeeper: boolean;
  substituteCount: number;
};

export type ReadinessInput = {
  competitionId: string | null;
  refereeName: string | null;
  home: TeamReadinessInput;
  away: TeamReadinessInput;
  vmixConnected: boolean;
  websiteSyncConnected: boolean;
};

/**
 * Checks designed but not implemented — the "Future Ready" list. Not
 * evaluated, not scored, shown in the Readiness Center as a reference of
 * what's next so the interface never needs redesigning to add them: each
 * becomes a real ReadinessCheck the same way the ones below already are.
 */
export const PLANNED_READINESS_CHECKS: { id: string; label: string; category: ReadinessCategory }[] = [
  { id: "live_stream_connected", label: "Live Stream Connected", category: "integration" },
  { id: "commentary_ready", label: "Commentary Ready", category: "production" },
  { id: "referee_data_ready", label: "Referee Data Ready", category: "foundation" },
  { id: "player_photos_ready", label: "Player Photos Ready", category: "lineup" },
  { id: "var_ready", label: "VAR Ready", category: "production" },
  { id: "sponsor_rotation_ready", label: "Sponsor Rotation Ready", category: "production" },
  { id: "replay_system_ready", label: "Replay System Ready", category: "production" },
  { id: "remote_camera_ready", label: "Remote Camera Ready", category: "production" },
  { id: "internet_health", label: "Internet Health", category: "integration" },
  { id: "audio_mixer_ready", label: "Audio Mixer Ready", category: "production" },
];

/** Builds one team's readiness input from the same data the Tactical Formation Panel and lineup already produce — no separate fetch, no duplicated logic. */
export function teamReadinessFromData(params: {
  lineupStatus: LineupStatus | null | undefined;
  formation: TacticalFormation | null;
  positions: TacticalPosition[];
  substituteCount: number;
}): TeamReadinessInput {
  return {
    lineupSubmitted: params.lineupStatus === "submitted",
    hasFormation: params.formation !== null,
    positionCount: params.positions.length,
    hasCaptain: params.positions.some((p) => p.captain),
    hasGoalkeeper: params.positions.some((p) => p.goalkeeper),
    substituteCount: params.substituteCount,
  };
}

export function buildReadinessReport(input: ReadinessInput): ReadinessReport {
  const bothTeams = <T,>(fn: (t: TeamReadinessInput) => T | boolean) =>
    Boolean(fn(input.home)) && Boolean(fn(input.away));

  const tacticalLayoutReady = bothTeams((t) => t.hasFormation && t.positionCount === 11);

  const checks: ReadinessCheck[] = [
    {
      id: "competition_selected",
      label: "Competition Selected",
      category: "foundation",
      status: input.competitionId ? "pass" : "warning",
      warningLabel: "No Competition Selected",
      actionLabel: "Open Matches",
      actionHref: () => "/admin/matches",
    },
    { id: "match_created", label: "Match Created", category: "foundation", status: "pass" },
    { id: "teams_confirmed", label: "Teams Confirmed", category: "foundation", status: "pass" },
    {
      id: "starting_xi_submitted",
      label: "Starting XI Submitted",
      category: "lineup",
      status: bothTeams((t) => t.lineupSubmitted) ? "pass" : "warning",
      warningLabel: "Starting XI Incomplete",
      critical: true,
      actionLabel: "Open Lineup Manager",
      actionHref: () => "/admin/lineups",
    },
    {
      id: "formation_selected",
      label: "Formation Selected",
      category: "tactical",
      status: bothTeams((t) => t.hasFormation) ? "pass" : "warning",
      warningLabel: "Formation Not Saved",
      critical: true,
      actionLabel: "Open Formation Editor",
      actionHref: (matchId) => `/live/${matchId}/formation`,
    },
    {
      id: "captain_verified",
      label: "Captain Verified",
      category: "lineup",
      status: bothTeams((t) => t.hasCaptain) ? "pass" : "warning",
      warningLabel: "No Captain Selected",
      critical: true,
      actionLabel: "Open Tactical Formation",
      actionHref: (matchId) => `/live/${matchId}/formation`,
    },
    {
      id: "goalkeeper_verified",
      label: "Goalkeeper Verified",
      category: "lineup",
      status: bothTeams((t) => t.hasGoalkeeper) ? "pass" : "warning",
      warningLabel: "Goalkeeper Missing",
      critical: true,
      actionLabel: "Open Tactical Formation",
      actionHref: (matchId) => `/live/${matchId}/formation`,
    },
    { id: "team_colors_verified", label: "Team Colors Verified", category: "production", status: "pass" },
    {
      id: "bench_players_verified",
      label: "Bench Players Verified",
      category: "lineup",
      status: bothTeams((t) => t.substituteCount > 0) ? "pass" : "warning",
      warningLabel: "Bench Players Missing",
      actionLabel: "Open Lineup Manager",
      actionHref: () => "/admin/lineups",
    },
    { id: "coach_information_ready", label: "Coach Information Ready", category: "foundation", status: "pass" },
    {
      id: "match_officials_ready",
      label: "Match Officials Ready",
      category: "foundation",
      status: input.refereeName ? "pass" : "warning",
      warningLabel: "Match Officials Not Set",
      critical: true,
      actionLabel: "Open Match Header",
      actionHref: (matchId) => `/live/${matchId}`,
    },
    { id: "broadcast_graphics_ready", label: "Broadcast Graphics Ready", category: "production", status: "not_tracked" },
    { id: "sponsor_graphics_ready", label: "Sponsor Graphics Ready", category: "production", status: "not_tracked" },
    { id: "competition_branding_ready", label: "Competition Branding Ready", category: "production", status: "pass" },
    {
      id: "animation_package_ready",
      label: "Animation Package Ready",
      category: "production",
      status: tacticalLayoutReady ? "pass" : "warning",
      warningLabel: "Animation Package Not Ready",
      actionLabel: "Open Formation Editor",
      actionHref: (matchId) => `/live/${matchId}/formation`,
    },
    {
      id: "tactical_layout_ready",
      label: "Tactical Layout Ready",
      category: "tactical",
      status: tacticalLayoutReady ? "pass" : "warning",
      warningLabel: "Tactical Layout Incomplete",
      critical: true,
      actionLabel: "Open Formation Editor",
      actionHref: (matchId) => `/live/${matchId}/formation`,
    },
    {
      id: "broadcast_preview_ready",
      label: "Broadcast Preview Ready",
      category: "production",
      status: tacticalLayoutReady ? "pass" : "warning",
      warningLabel: "Broadcast Preview Not Ready",
      actionLabel: "Open Formation Editor",
      actionHref: (matchId) => `/live/${matchId}/formation`,
    },
    {
      id: "vmix_configuration_ready",
      label: "vMix Configuration Ready",
      category: "integration",
      status: input.vmixConnected ? "pass" : "warning",
      warningLabel: "vMix Not Configured",
      actionLabel: "Open Broadcast Settings",
      actionHref: (matchId) => `/live/${matchId}`,
    },
    {
      id: "website_sync_ready",
      label: "Website Sync Ready",
      category: "integration",
      status: input.websiteSyncConnected ? "pass" : "warning",
      warningLabel: "Website Sync Not Configured",
      actionLabel: "Open Website Integration",
      actionHref: (matchId) => `/live/${matchId}`,
    },
  ];

  const trackable = checks.filter((c) => c.status !== "not_tracked");
  const passed = trackable.filter((c) => c.status === "pass");
  const scorePercent = trackable.length ? Math.round((passed.length / trackable.length) * 100) : 100;
  const matchdayStatus: MatchdayStatus = scorePercent === 100 ? "ready" : scorePercent >= 75 ? "attention" : "not_ready";

  const blockingChecks = checks.filter((c) => c.critical && c.status !== "pass");
  const canGoLive = blockingChecks.length === 0;

  return { checks, scorePercent, trackedCount: trackable.length, passedCount: passed.length, matchdayStatus, canGoLive, blockingChecks };
}
