import "server-only";
import { supabaseAdmin } from "@/lib/supabase-admin";
import { deriveMatchClock } from "@/lib/match-clock";
import type { MatchEvent, MatchEventType, MatchLiveStatus } from "@/lib/types";

/**
 * The Public Match Center's one read model — per product decision, this
 * page "IS the beginning of the public website," so this function is
 * written to be the reusable seam: a future full GoodGrafik website (or a
 * public API route) calls this same function rather than a second,
 * parallel public data layer being invented later. It returns a
 * deliberately public DTO, not raw table rows — every field here has
 * already been decided safe to show an anonymous visitor. In particular:
 * team `coach_phone`/`coach_email`/`token` (private contact info and the
 * Coach Portal's own access token) are never selected here, and lineups/
 * tactical formations are intentionally out of scope for this page — the
 * Formation Engine has always been Broadcast-Control-Center-only, and
 * this function doesn't change that.
 */

export type PublicMatchPhase = "upcoming" | "live" | "finished";

export type PublicMatchTeam = {
  name: string;
  logoUrl: string | null;
  coachName: string;
  coachPhotoUrl: string | null;
};

export type PublicMatchEvent = {
  minute: string;
  type: MatchEventType;
  teamName: string | null;
  playerName: string | null;
  description: string | null;
};

export type PublicMatchStatistics = {
  possessionPercent: number;
  shots: number;
  shotsOnTarget: number;
  corners: number;
  fouls: number;
  offside: number;
  yellowCards: number;
  redCards: number;
  saves: number;
  expectedGoals: number | null;
};

export type PublicMatchView = {
  matchId: string;
  competitionName: string | null;
  organizationName: string | null;
  organizationLogoUrl: string | null;
  competitionLogoUrl: string | null;
  round: string | null;
  matchDate: string;
  matchTime: string;
  liveStatus: MatchLiveStatus;
  phase: PublicMatchPhase;
  minuteLabel: string;
  additionalTimeLabel: string | null;
  homeScore: number;
  awayScore: number;
  homeTeam: PublicMatchTeam;
  awayTeam: PublicMatchTeam;
  venueName: string | null;
  venueCity: string | null;
  refereeName: string | null;
  events: PublicMatchEvent[];
  homeStatistics: PublicMatchStatistics | null;
  awayStatistics: PublicMatchStatistics | null;
};

function toPublicStatistics(row: {
  team_id: string;
  possession_percent: number;
  shots: number;
  shots_on_target: number;
  corners: number;
  fouls: number;
  offside: number;
  yellow_cards: number;
  red_cards: number;
  saves: number;
  expected_goals: number | null;
} | undefined): PublicMatchStatistics | null {
  if (!row) return null;
  return {
    possessionPercent: row.possession_percent,
    shots: row.shots,
    shotsOnTarget: row.shots_on_target,
    corners: row.corners,
    fouls: row.fouls,
    offside: row.offside,
    yellowCards: row.yellow_cards,
    redCards: row.red_cards,
    saves: row.saves,
    expectedGoals: row.expected_goals,
  };
}

export async function getPublicMatchView(matchId: string): Promise<PublicMatchView | null> {
  const supabase = supabaseAdmin();

  const { data: matchRow } = await supabase
    .from("matches")
    .select(
      `id, round, match_date, match_time, live_status, home_score, away_score, referee_name, home_team_id, away_team_id,
       competition:competitions(name, logo_url, organization:organizations(name, logo_url)),
       home_team:teams!matches_home_team_id_fkey(name, logo_url, coach_name, coach_photo_url),
       away_team:teams!matches_away_team_id_fkey(name, logo_url, coach_name, coach_photo_url),
       venue_record:venues(name, city)`
    )
    .eq("id", matchId)
    .maybeSingle();

  if (!matchRow) return null;

  // Supabase's inferred types treat every joined relation as an array
  // (it can't tell a to-one FK join from a to-many one without generated
  // schema types, which this project doesn't have) — cast once here to
  // the real shape, the same pattern lib/live-match.ts's getLiveMatch
  // already uses for its own joins.
  const match = matchRow as unknown as {
    id: string;
    round: string | null;
    match_date: string;
    match_time: string;
    live_status: MatchLiveStatus | null;
    home_score: number | null;
    away_score: number | null;
    referee_name: string | null;
    home_team_id: string;
    away_team_id: string;
    competition: { name: string; logo_url: string | null; organization: { name: string; logo_url: string | null } | null } | null;
    home_team: { name: string; logo_url: string | null; coach_name: string; coach_photo_url: string | null };
    away_team: { name: string; logo_url: string | null; coach_name: string; coach_photo_url: string | null };
    venue_record: { name: string; city: string | null } | null;
  };

  const [{ data: events }, { data: statsRows }, { data: homePlayers }, { data: awayPlayers }] = await Promise.all([
    supabase.from("match_events").select("*").eq("match_id", matchId).order("created_at"),
    supabase.from("match_statistics").select("*").eq("match_id", matchId),
    supabase.from("players").select("id, full_name").eq("team_id", match.home_team_id),
    supabase.from("players").select("id, full_name").eq("team_id", match.away_team_id),
  ]);

  const playerNameById = new Map([...(homePlayers ?? []), ...(awayPlayers ?? [])].map((p) => [p.id as string, p.full_name as string]));
  const teamNameById = new Map([
    [match.home_team_id, match.home_team.name],
    [match.away_team_id, match.away_team.name],
  ]);

  const status = (match.live_status ?? "pre_match") as MatchLiveStatus;
  const rawEvents = (events ?? []) as MatchEvent[];
  const { minuteLabel, additionalTimeLabel } = deriveMatchClock(status, rawEvents);
  const phase: PublicMatchPhase = status === "pre_match" ? "upcoming" : status === "full_time" ? "finished" : "live";

  const publicEvents: PublicMatchEvent[] = rawEvents.map((e) => ({
    minute: e.minute,
    type: e.type,
    teamName: e.team_id ? teamNameById.get(e.team_id) ?? null : null,
    playerName: e.player_id ? playerNameById.get(e.player_id) ?? null : null,
    description: e.description,
  }));

  const statsByTeam = new Map((statsRows ?? []).map((s) => [s.team_id as string, s]));

  return {
    matchId: match.id,
    competitionName: match.competition?.name ?? null,
    organizationName: match.competition?.organization?.name ?? null,
    organizationLogoUrl: match.competition?.organization?.logo_url ?? null,
    competitionLogoUrl: match.competition?.logo_url ?? null,
    round: match.round,
    matchDate: match.match_date,
    matchTime: match.match_time,
    liveStatus: status,
    phase,
    minuteLabel,
    additionalTimeLabel,
    homeScore: match.home_score ?? 0,
    awayScore: match.away_score ?? 0,
    homeTeam: {
      name: match.home_team.name,
      logoUrl: match.home_team.logo_url,
      coachName: match.home_team.coach_name,
      coachPhotoUrl: match.home_team.coach_photo_url ?? null,
    },
    awayTeam: {
      name: match.away_team.name,
      logoUrl: match.away_team.logo_url,
      coachName: match.away_team.coach_name,
      coachPhotoUrl: match.away_team.coach_photo_url ?? null,
    },
    venueName: match.venue_record?.name ?? null,
    venueCity: match.venue_record?.city ?? null,
    refereeName: match.referee_name ?? null,
    events: publicEvents,
    homeStatistics: toPublicStatistics(statsByTeam.get(match.home_team_id)),
    awayStatistics: toPublicStatistics(statsByTeam.get(match.away_team_id)),
  };
}
