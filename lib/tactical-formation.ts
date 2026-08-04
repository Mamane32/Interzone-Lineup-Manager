import "server-only";
import { cache } from "react";
import { supabaseAdmin } from "@/lib/supabase-admin";
import { validateFormation, resolveSlotPositions, type SlotAssignment } from "@/lib/formation-engine";
import type { FormationName, TacticalFormation, TacticalPosition } from "@/lib/types";

export type TacticalFormationBundle = {
  formation: TacticalFormation | null;
  positions: TacticalPosition[];
};

/**
 * Read access shared by every Formation Engine consumer — Broadcast/Admin
 * (app/live/[matchId]/formation/page.tsx) and Coach
 * (app/team/[token]/(coach)/formation/page.tsx) alike. No role check here;
 * each caller's own page/action gates who may call it.
 */
export const getTacticalFormation = cache(async (matchId: string, teamId: string): Promise<TacticalFormationBundle> => {
  const supabase = supabaseAdmin();
  const { data: formation } = await supabase
    .from("tactical_formations")
    .select("*")
    .eq("match_id", matchId)
    .eq("team_id", teamId)
    .maybeSingle();

  if (!formation) return { formation: null, positions: [] };

  const { data: positions } = await supabase.from("tactical_positions").select("*").eq("tactical_formation_id", formation.id);

  return { formation: formation as TacticalFormation, positions: (positions ?? []) as TacticalPosition[] };
});

export type SaveFormationResult = { ok: true } | { ok: false; error: string };

/**
 * The Formation Engine's only write path — role-agnostic on purpose. Every
 * permission-boundary action (admin/broadcast's saveFormation today, a
 * coach-scoped action in a later phase) calls this same function after its
 * own requireX() + scope check; this function itself never checks who's
 * calling, only whether the match/team/formation data is legitimate.
 *
 * Shirt number and every slot-derived property (tacticalPosition,
 * goalkeeper, and x/y for anything but "custom") are looked up here, never
 * trusted from the caller — the engine is the one source of truth for
 * what a formation IS, not whatever a client happened to submit.
 */
export async function saveFormationCore(
  matchId: string,
  teamId: string,
  formation: FormationName,
  assignments: SlotAssignment[]
): Promise<SaveFormationResult> {
  const supabase = supabaseAdmin();

  const { data: match } = await supabase.from("matches").select("id, home_team_id, away_team_id").eq("id", matchId).maybeSingle();
  if (!match) return { ok: false, error: "Match not found." };
  if (match.home_team_id !== teamId && match.away_team_id !== teamId) {
    return { ok: false, error: "That team is not part of this match." };
  }

  const { data: roster } = await supabase.from("players").select("id, number").eq("team_id", teamId);
  const rosterById = new Map((roster ?? []).map((p) => [p.id as string, p.number as number]));

  const validation = validateFormation(formation, assignments, new Set(rosterById.keys()));
  if (!validation.ok) return validation;

  const resolved = resolveSlotPositions(formation, assignments);

  const { data: formationRow, error: formationError } = await supabase
    .from("tactical_formations")
    .upsert({ match_id: matchId, team_id: teamId, formation }, { onConflict: "match_id,team_id" })
    .select("id")
    .single();

  if (formationError || !formationRow) {
    console.error("saveFormationCore: upsert tactical_formations failed", formationError);
    return { ok: false, error: "Could not save the formation." };
  }

  // Replace the full slot set — the simplest correct way to reconcile
  // "some players moved, the formation shape may have changed" without
  // diffing row by row.
  const { error: deleteError } = await supabase.from("tactical_positions").delete().eq("tactical_formation_id", formationRow.id);
  if (deleteError) {
    console.error("saveFormationCore: clearing tactical_positions failed", deleteError);
    return { ok: false, error: "Could not save player positions." };
  }

  const { error: insertError } = await supabase.from("tactical_positions").insert(
    resolved.map((a) => ({
      tactical_formation_id: formationRow.id,
      slot_key: a.slotKey,
      player_id: a.playerId,
      tactical_position: a.tacticalPosition,
      x_coordinate: a.x,
      y_coordinate: a.y,
      shirt_number: rosterById.get(a.playerId) ?? 0,
      captain: a.captain,
      goalkeeper: a.goalkeeper,
    }))
  );

  if (insertError) {
    console.error("saveFormationCore: inserting tactical_positions failed", insertError);
    return { ok: false, error: "Could not save player positions." };
  }

  return { ok: true };
}
