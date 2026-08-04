"use server";

import { revalidatePath } from "next/cache";
import { requireCoach } from "@/lib/coach-auth";
import { supabaseAdmin } from "@/lib/supabase-admin";
import { getSessionUser } from "@/lib/access";
import { recordAuditEvent } from "@/lib/audit";
import { uploadImage, ASSET_CATEGORIES, type ImageUploadResult } from "@/lib/image-upload";
import {
  isPlayerPosition,
  isPreferredFoot,
  COACH_SETTABLE_AVAILABILITY_STATUSES,
} from "@/lib/validation";
import type { PlayerAvailabilityStatus } from "@/lib/types";

export type RosterActionResult = { ok: true } | { ok: false; error: string };

/**
 * Shared field parsing for Add/Edit — the roster's own optional fields
 * (position, preferred_foot, captain flag), never the availability status
 * (that has its own, role-gated path — see setPlayerAvailability below).
 */
function parsePlayerFields(formData: FormData) {
  const number = Number(formData.get("number"));
  const full_name = String(formData.get("full_name") ?? "").trim();
  const positionRaw = String(formData.get("position") ?? "");
  const preferredFootRaw = String(formData.get("preferred_foot") ?? "");
  const is_captain = formData.get("is_captain") === "on";

  return {
    number,
    full_name,
    position: isPlayerPosition(positionRaw) ? positionRaw : null,
    preferred_foot: isPreferredFoot(preferredFootRaw) ? preferredFootRaw : null,
    is_captain,
  };
}

/**
 * At most one default captain per team (players_one_captain_per_team,
 * migration 020) — clearing every other player's flag before setting this
 * one avoids the unique-index violation, since these are two decoupled
 * updates rather than a single atomic swap.
 */
async function applyCaptainFlag(admin: ReturnType<typeof supabaseAdmin>, teamId: string, playerId: string, isCaptain: boolean) {
  if (!isCaptain) return;
  await admin.from("players").update({ is_captain: false }).eq("team_id", teamId).neq("id", playerId).eq("is_captain", true);
}

export async function addPlayer(token: string, formData: FormData): Promise<RosterActionResult> {
  const { team } = await requireCoach(token);
  const fields = parsePlayerFields(formData);

  if (!fields.number || fields.number < 1) return { ok: false, error: "Enter a valid jersey number." };
  if (!fields.full_name) return { ok: false, error: "Enter the player's full name." };

  const admin = supabaseAdmin();

  const { data: player, error } = await admin
    .from("players")
    .insert({
      team_id: team.id,
      number: fields.number,
      full_name: fields.full_name,
      position: fields.position,
      preferred_foot: fields.preferred_foot,
      is_captain: fields.is_captain,
      active: true,
      availability_status: "available",
    })
    .select("id")
    .single();

  if (error || !player) {
    console.error("addPlayer failed", team.id, error);
    if (error?.code === "23505") return { ok: false, error: "That jersey number is already used on this roster." };
    return { ok: false, error: "Could not add this player. Please try again." };
  }

  await applyCaptainFlag(admin, team.id, player.id, fields.is_captain);

  const actor = await getSessionUser();
  if (actor) {
    await recordAuditEvent({
      actorUserId: actor.id,
      action: "player.added",
      targetType: "player",
      targetId: player.id,
      metadata: { team_id: team.id, number: fields.number, full_name: fields.full_name },
    });
  }

  revalidatePath(`/team/${token}/roster`);
  return { ok: true };
}

export async function updatePlayer(token: string, playerId: string, formData: FormData): Promise<RosterActionResult> {
  const { team } = await requireCoach(token);
  const fields = parsePlayerFields(formData);

  if (!fields.number || fields.number < 1) return { ok: false, error: "Enter a valid jersey number." };
  if (!fields.full_name) return { ok: false, error: "Enter the player's full name." };

  const admin = supabaseAdmin();

  const { error } = await admin
    .from("players")
    .update({
      number: fields.number,
      full_name: fields.full_name,
      position: fields.position,
      preferred_foot: fields.preferred_foot,
      is_captain: fields.is_captain,
    })
    .eq("id", playerId)
    .eq("team_id", team.id);

  if (error) {
    console.error("updatePlayer failed", playerId, error);
    if (error.code === "23505") return { ok: false, error: "That jersey number is already used on this roster." };
    return { ok: false, error: "Could not save this player. Please try again." };
  }

  await applyCaptainFlag(admin, team.id, playerId, fields.is_captain);

  revalidatePath(`/team/${token}/roster`);
  return { ok: true };
}

/**
 * Coach-settable subset only (available/doubtful/injured) — 'suspended' is
 * a competition-imposed disciplinary fact, not coach-editable (Sprint 3
 * Phase 2 Master Plan §4.3b). Rejected server-side, not just hidden from
 * the form, since a form field can't be trusted as the actual boundary.
 */
export async function setPlayerAvailability(token: string, playerId: string, status: string): Promise<RosterActionResult> {
  const { team } = await requireCoach(token);

  if (!(COACH_SETTABLE_AVAILABILITY_STATUSES as string[]).includes(status)) {
    return { ok: false, error: "Coaches can set Available, Doubtful, or Injured. Suspended status is set by competition administrators." };
  }

  const admin = supabaseAdmin();
  const { error } = await admin
    .from("players")
    .update({ availability_status: status as PlayerAvailabilityStatus })
    .eq("id", playerId)
    .eq("team_id", team.id);

  if (error) {
    console.error("setPlayerAvailability failed", playerId, error);
    return { ok: false, error: "Could not update this player's status. Please try again." };
  }

  revalidatePath(`/team/${token}/roster`);
  return { ok: true };
}

export async function setPlayerActive(token: string, playerId: string, active: boolean): Promise<RosterActionResult> {
  const { team } = await requireCoach(token);

  const admin = supabaseAdmin();
  const { error } = await admin.from("players").update({ active }).eq("id", playerId).eq("team_id", team.id);

  if (error) {
    console.error("setPlayerActive failed", playerId, error);
    return { ok: false, error: "Could not update this player. Please try again." };
  }

  revalidatePath(`/team/${token}/roster`);
  return { ok: true };
}

async function playerHasMatchHistory(admin: ReturnType<typeof supabaseAdmin>, playerId: string): Promise<boolean> {
  const [eventRow, startingRow, subRow, captainRow] = await Promise.all([
    admin.from("match_events").select("id", { count: "exact", head: true }).eq("player_id", playerId),
    admin.from("lineups").select("id", { count: "exact", head: true }).contains("starting_xi", [playerId]),
    admin.from("lineups").select("id", { count: "exact", head: true }).contains("substitutes", [playerId]),
    admin.from("lineups").select("id", { count: "exact", head: true }).eq("captain_id", playerId),
  ]);
  return (eventRow.count ?? 0) > 0 || (startingRow.count ?? 0) > 0 || (subRow.count ?? 0) > 0 || (captainRow.count ?? 0) > 0;
}

/**
 * Only ever a real delete when the player has zero match history (Sprint 3
 * Phase 2 Master Plan §4.3) — otherwise instructs the caller to deactivate
 * instead, preserving historical Match Events/Lineups (player_id foreign
 * keys, not free text) intact.
 */
export async function deletePlayer(token: string, playerId: string): Promise<RosterActionResult> {
  const { team } = await requireCoach(token);
  const admin = supabaseAdmin();

  const hasHistory = await playerHasMatchHistory(admin, playerId);
  if (hasHistory) {
    return { ok: false, error: "This player has match history and can't be deleted — deactivate them instead to preserve past records." };
  }

  const { error } = await admin.from("players").delete().eq("id", playerId).eq("team_id", team.id);
  if (error) {
    console.error("deletePlayer failed", playerId, error);
    return { ok: false, error: "Could not delete this player. Please try again." };
  }

  revalidatePath(`/team/${token}/roster`);
  return { ok: true };
}

export type UploadPlayerPhotoResult = ImageUploadResult;

export async function uploadPlayerPhoto(token: string, playerId: string, formData: FormData): Promise<UploadPlayerPhotoResult> {
  const { team } = await requireCoach(token);

  const result = await uploadImage(ASSET_CATEGORIES.PlayerPhoto, formData.get("photo") as File | null, playerId);
  if (!result.ok) return result;

  const admin = supabaseAdmin();
  const { error } = await admin.from("players").update({ photo_url: result.url }).eq("id", playerId).eq("team_id", team.id);
  if (error) {
    console.error("uploadPlayerPhoto: player update failed", error);
    return { ok: false, error: "Could not save the photo." };
  }

  revalidatePath(`/team/${token}/roster`);
  return result;
}
