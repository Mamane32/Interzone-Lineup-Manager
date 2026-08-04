"use server";

import { revalidatePath } from "next/cache";
import { requireRole } from "@/lib/access";
import { supabaseAdmin } from "@/lib/supabase-admin";
import { recordAuditEvent } from "@/lib/audit";
import { saveFormationCore, type SaveFormationResult } from "@/lib/tactical-formation";
import type { SlotAssignment } from "@/lib/formation-engine";
import type { FormationName } from "@/lib/types";

export type FormationPositionInput = SlotAssignment;
export type { SaveFormationResult };

/**
 * The Admin permission boundary for the Formation Engine — strictly
 * private to the Broadcast Control Center's admin surface. Gated to
 * admin/super_admin only: `broadcast_operator` is deliberately absent from
 * this list — Broadcast is strictly read-only per the Formation Engine
 * decision, and never modifies formations. Broadcast can still view this
 * page (see page.tsx's own gate, which does include broadcast_operator) —
 * it just can't call this action; the UI disables every mutation path
 * when the viewer isn't an admin (see TacticalFormationBoard's `canEdit`).
 *
 * This function is now a thin scope check — every actual validation and
 * persistence rule lives in the role-agnostic engine
 * (lib/formation-engine.ts, lib/tactical-formation.ts's saveFormationCore),
 * shared with whatever permission boundary a future Coach-side action adds.
 */
export async function saveFormation(
  matchId: string,
  teamId: string,
  formation: FormationName,
  positions: FormationPositionInput[]
): Promise<SaveFormationResult> {
  const { userId } = await requireRole(["admin", "super_admin"]);

  const supabase = supabaseAdmin();
  const { data: match } = await supabase.from("matches").select("id, home_team_id, away_team_id").eq("id", matchId).maybeSingle();
  if (!match) return { ok: false, error: "Match not found." };
  if (match.home_team_id !== teamId && match.away_team_id !== teamId) {
    return { ok: false, error: "That team is not part of this match." };
  }

  const result = await saveFormationCore(matchId, teamId, formation, positions);
  if (!result.ok) return result;

  await recordAuditEvent({
    actorUserId: userId,
    action: "match.formation_saved",
    targetType: "match",
    targetId: matchId,
    metadata: { team_id: teamId, formation, player_count: positions.length },
  });

  revalidatePath(`/live/${matchId}/formation`);
  return { ok: true };
}
