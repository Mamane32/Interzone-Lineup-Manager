"use server";

import { requireAdmin, requireRole, getSessionUser } from "@/lib/access";
import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { supabaseAdmin } from "@/lib/supabase-admin";
import { recordAuditEvent } from "@/lib/audit";
import { createInvitation, resendInvitationCore } from "@/lib/invitation-service";
import type { Invitation } from "@/lib/types";

/**
 * Provisions (or re-invites) the coach's login for the Coach Portal,
 * through the same unified `invitations` table every other role uses
 * (Sprint 3 Phase 1) — coaches now appear in /admin/invitations with
 * working Resend/Revoke and the same audit trail, and activate on
 * acceptance like every other role instead of immediately at invite time.
 * The invited coach clicks the emailed link, lands on
 * /team/reset-password?token=..., and sets their own password there.
 *
 * The pre-Sprint-1.2 `teams.coach_email` string-match fallback
 * (lib/coach-auth.ts, app/team/[token]/login/actions.ts) is untouched by
 * this — it only affects how invites are created/tracked, never how
 * coach login itself is checked.
 */
export async function inviteCoach(teamId: string) {
  await requireAdmin();
  const actor = await getSessionUser();
  const admin = supabaseAdmin();
  const { data: team } = await admin.from("teams").select("*").eq("id", teamId).single();

  if (!team?.coach_email) {
    redirect(`/admin/teams/${teamId}?invite=missing-email`);
  }

  // Reuse an existing actionable invitation for this team's coach rather
  // than creating a duplicate row every time the button is clicked.
  const { data: existing } = await admin
    .from("invitations")
    .select("*")
    .eq("email", team.coach_email)
    .eq("role_key", "coach")
    .eq("team_id", team.id)
    .in("status", ["pending", "expired"])
    .order("created_at", { ascending: false })
    .limit(1)
    .maybeSingle<Invitation>();

  let sent: boolean;

  if (existing) {
    const result = await resendInvitationCore(existing);
    sent = result.ok;
    if (actor) {
      await recordAuditEvent({
        actorUserId: actor.id,
        action: "invitation.resent",
        targetType: "invitation",
        targetId: existing.id,
        metadata: { email: team.coach_email, role_key: "coach", team_id: team.id, sent },
      });
    }
  } else {
    const result = await createInvitation({
      email: team.coach_email,
      full_name: team.coach_name ?? null,
      role_key: "coach",
      competition_id: team.competition_id,
      team_id: team.id,
      message: null,
      expires_at: null,
      invited_by: actor?.id ?? null,
      redirectPath: `/team/reset-password?token=${team.token}`,
    });
    sent = result.ok;
    if (actor && "invitation" in result) {
      await recordAuditEvent({
        actorUserId: actor.id,
        action: "user.invited",
        targetType: "invitation",
        targetId: result.invitation.id,
        metadata: { email: team.coach_email, role_key: "coach", team_id: team.id, sent },
      });
    }
  }

  revalidatePath(`/admin/teams/${teamId}`);
  revalidatePath("/admin/invitations");
  redirect(`/admin/teams/${teamId}?invite=${sent ? "sent" : "failed"}`);
}

export async function addPlayer(teamId: string, formData: FormData) {
  await requireAdmin();
  const number = Number(formData.get("number"));
  const full_name = String(formData.get("full_name") ?? "").trim();
  if (!number || !full_name) return;

  const supabase = supabaseAdmin();
  await supabase.from("players").insert({ team_id: teamId, number, full_name });
  revalidatePath(`/admin/teams/${teamId}`);
}

export async function updatePlayer(teamId: string, playerId: string, formData: FormData) {
  await requireAdmin();
  const number = Number(formData.get("number"));
  const full_name = String(formData.get("full_name") ?? "").trim();
  if (!number || !full_name) return;

  const supabase = supabaseAdmin();
  await supabase.from("players").update({ number, full_name }).eq("id", playerId);
  revalidatePath(`/admin/teams/${teamId}`);
}

export async function deletePlayer(teamId: string, playerId: string) {
  await requireAdmin();
  const supabase = supabaseAdmin();
  await supabase.from("players").delete().eq("id", playerId);
  revalidatePath(`/admin/teams/${teamId}`);
}

export type SetPlayerSuspensionResult = { ok: true } | { ok: false; error: string };

/**
 * The one availability value a coach may never set directly (Sprint 3
 * Phase 2 Master Plan §4.3b) — 'suspended' is a competition-imposed
 * disciplinary fact, not self-reported team information. Deliberately
 * gated wider than the rest of this file's requireAdmin()-only player
 * actions: "competition administrators (or authorized league officials)"
 * maps most directly to this platform's competition_manager role, not
 * only admin/super_admin.
 */
export async function setPlayerSuspension(teamId: string, playerId: string, suspended: boolean): Promise<SetPlayerSuspensionResult> {
  await requireRole(["admin", "super_admin", "competition_manager"]);
  const actor = await getSessionUser();

  const supabase = supabaseAdmin();
  const { error } = await supabase
    .from("players")
    .update({ availability_status: suspended ? "suspended" : "available" })
    .eq("id", playerId)
    .eq("team_id", teamId);

  if (error) {
    console.error("setPlayerSuspension failed", playerId, error);
    return { ok: false, error: "Could not update this player's suspension status. Please try again." };
  }

  if (actor) {
    await recordAuditEvent({
      actorUserId: actor.id,
      action: suspended ? "player.suspended" : "player.suspension_lifted",
      targetType: "player",
      targetId: playerId,
      metadata: { team_id: teamId },
    });
  }

  revalidatePath(`/admin/teams/${teamId}`);
  return { ok: true };
}
