import "server-only";
import { supabaseAdmin } from "@/lib/supabase-admin";
import type { MatchStatistics } from "@/lib/types";

export type StatField = "shots" | "shots_on_target" | "corners" | "fouls" | "offside" | "yellow_cards" | "red_cards" | "saves";

const STAT_FIELDS: StatField[] = ["shots", "shots_on_target", "corners", "fouls", "offside", "yellow_cards", "red_cards", "saves"];

/** Both teams' rows for a match — auto-created by the matches_create_match_statistics trigger (migration 015), so this is never empty for a real match. */
export async function listMatchStatistics(matchId: string): Promise<MatchStatistics[]> {
  const supabase = supabaseAdmin();
  const { data } = await supabase.from("match_statistics").select("*").eq("match_id", matchId);
  return (data ?? []) as MatchStatistics[];
}

/**
 * The one shared counter-adjustment core — every independent (non-
 * possession) statistic goes through this. Read-then-write, not an
 * atomic increment: an operator's own one-click-at-a-time pace during a
 * single match has no real concurrent-write scenario to guard against,
 * matching how addGoalEvent already reads-then-writes matches.home_score.
 * Clamped at 0 — a statistic can't go negative.
 */
export async function adjustMatchStatistic(matchId: string, teamId: string, field: StatField, delta: number): Promise<void> {
  if (!STAT_FIELDS.includes(field)) return;
  const supabase = supabaseAdmin();
  const { data: row } = await supabase.from("match_statistics").select(field).eq("match_id", matchId).eq("team_id", teamId).maybeSingle();
  if (!row) return;
  const current = (row as Record<StatField, number>)[field];
  const next = Math.max(0, current + delta);
  await supabase
    .from("match_statistics")
    .update({ [field]: next })
    .eq("match_id", matchId)
    .eq("team_id", teamId);
}

/** Possession is zero-sum between the two teams — adjusting one side applies the inverse to the other in the same call, both clamped to 0-100. */
export async function adjustPossession(matchId: string, teamId: string, opponentTeamId: string, delta: number): Promise<void> {
  const supabase = supabaseAdmin();
  const [{ data: teamRow }, { data: opponentRow }] = await Promise.all([
    supabase.from("match_statistics").select("possession_percent").eq("match_id", matchId).eq("team_id", teamId).maybeSingle(),
    supabase.from("match_statistics").select("possession_percent").eq("match_id", matchId).eq("team_id", opponentTeamId).maybeSingle(),
  ]);
  if (!teamRow || !opponentRow) return;

  const nextTeam = Math.min(100, Math.max(0, teamRow.possession_percent + delta));
  const actualDelta = nextTeam - teamRow.possession_percent;
  const nextOpponent = Math.min(100, Math.max(0, opponentRow.possession_percent - actualDelta));

  await Promise.all([
    supabase.from("match_statistics").update({ possession_percent: nextTeam }).eq("match_id", matchId).eq("team_id", teamId),
    supabase.from("match_statistics").update({ possession_percent: nextOpponent }).eq("match_id", matchId).eq("team_id", opponentTeamId),
  ]);
}
