import "server-only";
import { supabaseAdmin } from "@/lib/supabase-admin";

/**
 * Current recommendation (Sprint 3 Phase 2 Master Plan §4.2) — the minimum
 * number of active roster players before Match Squad unlocks. One shared
 * constant so the gate (lib/coach-auth.ts's requireRosterReady) and the
 * Roster page's progress indicator can never drift apart.
 */
export const MIN_ACTIVE_ROSTER_PLAYERS = 11;

export async function getActiveRosterCount(teamId: string): Promise<number> {
  const admin = supabaseAdmin();
  const { count } = await admin
    .from("players")
    .select("id", { count: "exact", head: true })
    .eq("team_id", teamId)
    .eq("active", true);
  return count ?? 0;
}

/**
 * The permanent roster's capacity, for display only (the roster is never
 * actually blocked at this number — see requireRosterReady, which gates
 * Match Squad, not roster size). Deliberately reuses existing competition
 * configuration instead of a new column: `match_squad_size`
 * (supabase/migrations/021_competition_squad_rules.sql) if the competition
 * has set one, otherwise a sensible computed default from two fields that
 * already exist — Starting XI (fixed at 11) + `max_bench` — so there's
 * always a real number to show without inventing new schema.
 */
export async function getRosterCapacity(competitionId: string | null): Promise<number> {
  if (!competitionId) return MIN_ACTIVE_ROSTER_PLAYERS;

  const admin = supabaseAdmin();
  const { data } = await admin
    .from("competitions")
    .select("match_squad_size, max_bench")
    .eq("id", competitionId)
    .maybeSingle();

  if (data?.match_squad_size) return data.match_squad_size;
  return MIN_ACTIVE_ROSTER_PLAYERS + (data?.max_bench ?? 9);
}
