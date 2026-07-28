import "server-only";
import { supabaseAdmin } from "@/lib/supabase-admin";

/**
 * Called once, right after a user successfully sets their password (see
 * app/team/reset-password/actions.ts) — the moment an invitation is
 * genuinely "accepted," not the moment it was sent. Safe to call
 * unconditionally after every successful password update, including
 * ordinary self-service resets that have nothing to do with an
 * invitation: if there's no matching pending invitation for this email,
 * this is a no-op.
 *
 * On success:
 *   invitations.status        -> 'accepted'
 *   invitations.accepted_user_id -> this user's id
 *   profiles.status            -> 'active'
 *   every user_access_assignments row created BY THIS INVITATION
 *   (matched via invitation_id, still in 'invited' status) -> 'active'
 *
 * Deliberately scoped to Sprint 1.3's `invitations` table only — the
 * separate, older coach-invite mechanism (admin/teams/[id]/actions.ts's
 * inviteCoach, from Sprint 1.2) does not create invitation rows and is
 * out of scope for this hardening pass; see SPRINT_1_3_IAM_HARDENING.md.
 */
export async function finalizeAcceptedInvitation(userId: string, email: string): Promise<void> {
  const admin = supabaseAdmin();

  const { data: invitation } = await admin
    .from("invitations")
    .select("*")
    .eq("status", "pending")
    .ilike("email", email)
    .order("created_at", { ascending: false })
    .limit(1)
    .maybeSingle();

  if (!invitation) return;

  const { error: inviteError } = await admin
    .from("invitations")
    .update({ status: "accepted", accepted_user_id: userId })
    .eq("id", invitation.id)
    .eq("status", "pending"); // guards against a double-accept race

  if (inviteError) {
    console.error("failed to mark invitation accepted", invitation.id, inviteError);
    return;
  }

  await admin.from("profiles").update({ status: "active" }).eq("id", userId);

  await admin
    .from("user_access_assignments")
    .update({ status: "active" })
    .eq("invitation_id", invitation.id)
    .eq("status", "invited");
}
