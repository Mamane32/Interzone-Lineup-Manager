"use server";

import { revalidatePath } from "next/cache";
import { supabaseAdmin } from "@/lib/supabase-admin";
import type { MatchLiveStatus, MatchEventType } from "@/lib/types";

const GOAL_TYPES: MatchEventType[] = ["goal", "penalty_goal", "own_goal"];

function revalidateMatch(matchId: string) {
  revalidatePath(`/live/${matchId}`);
  revalidatePath(`/live/${matchId}/report`);
}

/** Match Status Controls — manual only, exactly as specified ("Do not implement backend automation yet"). */
export async function setLiveStatus(matchId: string, status: MatchLiveStatus) {
  const supabase = supabaseAdmin();
  await supabase.from("matches").update({ live_status: status }).eq("id", matchId);
  revalidateMatch(matchId);
}

/**
 * Adds a goal-type event AND keeps matches.home_score/away_score in sync —
 * own goals credit the *other* team's score, same as real football.
 */
export async function addGoalEvent(
  matchId: string,
  scoringTeamId: string,
  opponentTeamId: string,
  type: Extract<MatchEventType, "goal" | "penalty_goal" | "own_goal">,
  minute: string,
  playerId: string | null,
  description: string | null
) {
  const supabase = supabaseAdmin();
  const { data: match } = await supabase.from("matches").select("home_team_id, away_team_id, home_score, away_score").eq("id", matchId).single();
  if (!match) return;

  const creditedTeamId = type === "own_goal" ? opponentTeamId : scoringTeamId;
  const isHomeCredited = creditedTeamId === match.home_team_id;

  await supabase.from("match_events").insert({
    match_id: matchId,
    minute,
    type,
    team_id: scoringTeamId,
    player_id: playerId,
    description,
  });

  await supabase
    .from("matches")
    .update(
      isHomeCredited
        ? { home_score: (match.home_score ?? 0) + 1 }
        : { away_score: (match.away_score ?? 0) + 1 }
    )
    .eq("id", matchId);

  revalidateMatch(matchId);
}

/** Non-goal timeline events — cards, substitutions, VAR, match-phase markers. */
export async function addMatchEvent(
  matchId: string,
  type: MatchEventType,
  minute: string,
  teamId: string | null,
  playerId: string | null,
  description: string | null
) {
  const supabase = supabaseAdmin();
  await supabase.from("match_events").insert({
    match_id: matchId,
    minute,
    type,
    team_id: teamId,
    player_id: playerId,
    description,
  });
  revalidateMatch(matchId);
}

/**
 * Deletes a timeline event. If it was a goal-type event, decrements the
 * credited team's score to match — this IS "Undo Goal" (undo is just
 * deleting the most recent goal event; the confirmation dialog and "most
 * recent" selection live in the UI, this action just needs an event id).
 */
export async function deleteMatchEvent(matchId: string, eventId: string) {
  const supabase = supabaseAdmin();
  const { data: event } = await supabase.from("match_events").select("*").eq("id", eventId).single();
  if (!event) return;

  await supabase.from("match_events").delete().eq("id", eventId);

  if (GOAL_TYPES.includes(event.type)) {
    const { data: match } = await supabase.from("matches").select("home_team_id, away_team_id, home_score, away_score").eq("id", matchId).single();
    if (match) {
      const creditedTeamId = event.type === "own_goal" ? (event.team_id === match.home_team_id ? match.away_team_id : match.home_team_id) : event.team_id;
      const isHomeCredited = creditedTeamId === match.home_team_id;
      await supabase
        .from("matches")
        .update(
          isHomeCredited
            ? { home_score: Math.max(0, (match.home_score ?? 0) - 1) }
            : { away_score: Math.max(0, (match.away_score ?? 0) - 1) }
        )
        .eq("id", matchId);
    }
  }

  revalidateMatch(matchId);
}

/** Manual Score Edit — direct override, independent of the event log. */
export async function setManualScore(matchId: string, homeScore: number, awayScore: number) {
  const supabase = supabaseAdmin();
  await supabase
    .from("matches")
    .update({ home_score: Math.max(0, homeScore), away_score: Math.max(0, awayScore) })
    .eq("id", matchId);
  revalidateMatch(matchId);
}

/** Match Header — venue and referee are optional operator-entered fields (Sprint 2 addition). */
export async function updateMatchHeaderInfo(matchId: string, formData: FormData) {
  const venue = String(formData.get("venue") ?? "").trim();
  const refereeName = String(formData.get("refereeName") ?? "").trim();

  const supabase = supabaseAdmin();
  await supabase
    .from("matches")
    .update({ venue: venue || null, referee_name: refereeName || null })
    .eq("id", matchId);
  revalidateMatch(matchId);
}
