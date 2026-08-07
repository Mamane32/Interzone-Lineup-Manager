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

export type PublicLineupPlayer = {
  playerId: string;
  name: string;
  number: number | null;
  position: string | null;
  isCaptain: boolean;
};

export type PublicFormationSlot = {
  playerId: string;
  x: number;
  y: number;
  isCaptain: boolean;
  isGoalkeeper: boolean;
  shirtNumber: number;
};

/**
 * A team's public lineup — `available` is false (and every other field
 * empty) unless the coach's submission is both `status: "submitted"` and
 * admin-`locked`, the same "this is final, not a draft" bar
 * LineupForm.tsx's own `alreadySubmitted` check uses. `formationSlots` is
 * separately empty whenever no one has used the (admin/broadcast-only)
 * Tactical Formation Panel for this match yet — a submitted lineup and a
 * drawn formation are two different, independent steps.
 */
export type PublicTeamLineup = {
  available: boolean;
  formationName: string | null;
  startingXI: PublicLineupPlayer[];
  substitutes: PublicLineupPlayer[];
  formationSlots: PublicFormationSlot[];
};

export type PublicMatchView = {
  matchId: string;
  competitionId: string | null;
  groupId: string | null;
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
  streamUrl: string | null;
  events: PublicMatchEvent[];
  homeStatistics: PublicMatchStatistics | null;
  awayStatistics: PublicMatchStatistics | null;
  homeLineup: PublicTeamLineup;
  awayLineup: PublicTeamLineup;
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

function toPublicTeamLineup(
  teamId: string,
  playerById: Map<string, { id: string; full_name: string; number: number | null; position: string | null }>,
  lineupRows: { team_id: string; status: string; starting_xi: string[]; substitutes: string[]; captain_id: string | null }[],
  formationRows: { team_id: string; formation: string; tactical_positions: { player_id: string; tactical_position: string; x_coordinate: number; y_coordinate: number; shirt_number: number; captain: boolean; goalkeeper: boolean }[] }[]
): PublicTeamLineup {
  const lineup = lineupRows.find((l) => l.team_id === teamId);
  const formation = formationRows.find((f) => f.team_id === teamId);

  const toPlayer = (playerId: string): PublicLineupPlayer | null => {
    const p = playerById.get(playerId);
    if (!p) return null;
    return { playerId, name: p.full_name, number: p.number, position: p.position, isCaptain: playerId === lineup?.captain_id };
  };

  return {
    available: Boolean(lineup),
    formationName: formation?.formation ?? null,
    startingXI: lineup ? lineup.starting_xi.map(toPlayer).filter((p): p is PublicLineupPlayer => p !== null) : [],
    substitutes: lineup ? lineup.substitutes.map(toPlayer).filter((p): p is PublicLineupPlayer => p !== null) : [],
    formationSlots: (formation?.tactical_positions ?? []).map((tp) => ({
      playerId: tp.player_id,
      x: tp.x_coordinate,
      y: tp.y_coordinate,
      isCaptain: tp.captain,
      isGoalkeeper: tp.goalkeeper,
      shirtNumber: tp.shirt_number,
    })),
  };
}

export async function getPublicMatchView(matchId: string): Promise<PublicMatchView | null> {
  const supabase = supabaseAdmin();

  const { data: matchRow } = await supabase
    .from("matches")
    .select(
      `id, competition_id, group_id, round, match_date, match_time, live_status, home_score, away_score, referee_name, stream_url, home_team_id, away_team_id,
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
    competition_id: string | null;
    group_id: string | null;
    round: string | null;
    match_date: string;
    match_time: string;
    live_status: MatchLiveStatus | null;
    home_score: number | null;
    away_score: number | null;
    referee_name: string | null;
    stream_url: string | null;
    home_team_id: string;
    away_team_id: string;
    competition: { name: string; logo_url: string | null; organization: { name: string; logo_url: string | null } | null } | null;
    home_team: { name: string; logo_url: string | null; coach_name: string; coach_photo_url: string | null };
    away_team: { name: string; logo_url: string | null; coach_name: string; coach_photo_url: string | null };
    venue_record: { name: string; city: string | null } | null;
  };

  const [{ data: events }, { data: statsRows }, { data: homePlayers }, { data: awayPlayers }, { data: lineupRows }, { data: formationRows }] = await Promise.all([
    supabase.from("match_events").select("*").eq("match_id", matchId).order("created_at"),
    supabase.from("match_statistics").select("*").eq("match_id", matchId),
    supabase.from("players").select("id, full_name, number, position").eq("team_id", match.home_team_id),
    supabase.from("players").select("id, full_name, number, position").eq("team_id", match.away_team_id),
    // Only submitted-and-locked lineups are ever public — a coach can
    // resubmit up to that point, and an admin can even reopen a locked
    // lineup, so "waiting"/"needs_correction"/unlocked data is never final
    // enough to show an anonymous visitor (see this module's own public-DTO
    // discipline note above).
    supabase.from("lineups").select("team_id, status, starting_xi, substitutes, captain_id, locked").eq("match_id", matchId).eq("status", "submitted").eq("locked", true),
    supabase.from("tactical_formations").select("id, team_id, formation, tactical_positions(player_id, tactical_position, x_coordinate, y_coordinate, shirt_number, captain, goalkeeper)").eq("match_id", matchId),
  ]);

  const playerNameById = new Map([...(homePlayers ?? []), ...(awayPlayers ?? [])].map((p) => [p.id as string, p.full_name as string]));
  const playerById = new Map(
    [...(homePlayers ?? []), ...(awayPlayers ?? [])].map((p) => [p.id as string, p as { id: string; full_name: string; number: number | null; position: string | null }])
  );
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

  const typedLineupRows = (lineupRows ?? []) as unknown as { team_id: string; status: string; starting_xi: string[]; substitutes: string[]; captain_id: string | null }[];
  const typedFormationRows = (formationRows ?? []) as unknown as {
    team_id: string;
    formation: string;
    tactical_positions: { player_id: string; tactical_position: string; x_coordinate: number; y_coordinate: number; shirt_number: number; captain: boolean; goalkeeper: boolean }[];
  }[];

  return {
    matchId: match.id,
    competitionId: match.competition_id,
    groupId: match.group_id,
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
    streamUrl: match.stream_url,
    events: publicEvents,
    homeStatistics: toPublicStatistics(statsByTeam.get(match.home_team_id)),
    awayStatistics: toPublicStatistics(statsByTeam.get(match.away_team_id)),
    homeLineup: toPublicTeamLineup(match.home_team_id, playerById, typedLineupRows, typedFormationRows),
    awayLineup: toPublicTeamLineup(match.away_team_id, playerById, typedLineupRows, typedFormationRows),
  };
}
