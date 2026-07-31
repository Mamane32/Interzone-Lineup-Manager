import "server-only";
import { cache } from "react";
import { notFound } from "next/navigation";
import { supabaseAdmin } from "@/lib/supabase-admin";
import type { Match, MatchEvent, Player, Team, LineupStatus } from "@/lib/types";

export type LiveMatchBundle = {
  match: Match & {
    home_team: Team;
    away_team: Team;
    competition: { id: string; name: string } | null;
  };
  events: MatchEvent[];
  homeLineup: {
    starting_xi: string[];
    substitutes: string[];
    captain_id: string | null;
    coach_name: string;
    status: LineupStatus;
    submitted_at: string | null;
  } | null;
  awayLineup: {
    starting_xi: string[];
    substitutes: string[];
    captain_id: string | null;
    coach_name: string;
    status: LineupStatus;
    submitted_at: string | null;
  } | null;
  homePlayers: Player[];
  awayPlayers: Player[];
};

/**
 * Loads everything the Live Center needs for one match: the match itself
 * (with Sprint 2's live_status/scores/venue/referee columns), its full
 * timeline, and both teams' submitted lineups + squads (reusing Sprint 1
 * data — no new tables needed for Team Panels). Memoized per-request so the
 * layout (top nav / match header) and the page (control panels) can both
 * call this without a duplicate round-trip.
 */
export const getLiveMatch = cache(async (matchId: string): Promise<LiveMatchBundle> => {
  const supabase = supabaseAdmin();

  const { data: match } = await supabase
    .from("matches")
    .select(
      "*, competition:competitions(id, name), home_team:teams!matches_home_team_id_fkey(*), away_team:teams!matches_away_team_id_fkey(*)"
    )
    .eq("id", matchId)
    .single();

  if (!match) notFound();

  const [{ data: events }, { data: homeLineupRow }, { data: awayLineupRow }, { data: homePlayers }, { data: awayPlayers }] =
    await Promise.all([
      supabase.from("match_events").select("*").eq("match_id", matchId).order("created_at"),
      supabase.from("lineups").select("*").eq("match_id", matchId).eq("team_id", match.home_team_id).maybeSingle(),
      supabase.from("lineups").select("*").eq("match_id", matchId).eq("team_id", match.away_team_id).maybeSingle(),
      supabase.from("players").select("*").eq("team_id", match.home_team_id).order("number"),
      supabase.from("players").select("*").eq("team_id", match.away_team_id).order("number"),
    ]);

  return {
    match: match as LiveMatchBundle["match"],
    events: (events ?? []) as MatchEvent[],
    homeLineup: homeLineupRow
      ? {
          starting_xi: homeLineupRow.starting_xi,
          substitutes: homeLineupRow.substitutes,
          captain_id: homeLineupRow.captain_id,
          coach_name: match.home_team.coach_name,
          status: homeLineupRow.status,
          submitted_at: homeLineupRow.submitted_at,
        }
      : null,
    awayLineup: awayLineupRow
      ? {
          starting_xi: awayLineupRow.starting_xi,
          substitutes: awayLineupRow.substitutes,
          captain_id: awayLineupRow.captain_id,
          coach_name: match.away_team.coach_name,
          status: awayLineupRow.status,
          submitted_at: awayLineupRow.submitted_at,
        }
      : null,
    homePlayers: (homePlayers ?? []) as Player[],
    awayPlayers: (awayPlayers ?? []) as Player[],
  };
});
