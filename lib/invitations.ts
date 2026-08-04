import "server-only";
import { supabaseAdmin } from "@/lib/supabase-admin";

export type FinalizeInvitationResult = { accepted: true } | { accepted: false; reason: "expired" };

/**
 * Called once, right after a user successfully sets their password (see
 * app/team/reset-password/actions.ts) — the moment an invitation is
 * genuinely "accepted," not the moment it was sent. Safe to call
 * unconditionally after every successful password update, including
 * ordinary self-service resets that have nothing to do with an
 * invitation: if there's no matching pending invitation for this email,
 * this is a no-op (returns `{accepted: true}` — there was nothing to
 * reject, this is a legitimate ordinary reset, not a failure).
 *
 * On success:
 *   invitations.status        -> 'accepted'
 *   invitations.accepted_user_id -> this user's id
 *   profiles.status            -> 'active'
 *   every user_access_assignments row created BY THIS INVITATION
 *   (matched via invitation_id, still in 'invited' status) -> 'active'
 *
 * If the matched invitation's expires_at has already passed, no access is
 * granted: invitations.status -> 'expired' instead, profiles/assignments
 * stay 'invited'. The caller (setNewPassword) redirects to an error state
 * rather than the workspace. Note the Auth account itself already has a
 * real password set by this point (updateUser succeeded before this was
 * called) — harmless, since every requireRole/requireCoach gate checks
 * status === 'active', which this deliberately withholds.
 */
export async function finalizeAcceptedInvitation(userId: string, email: string): Promise<FinalizeInvitationResult> {
  const admin = supabaseAdmin();

  const { data: invitation } = await admin
    .from("invitations")
    .select("*")
    .eq("status", "pending")
    .ilike("email", email)
    .order("created_at", { ascending: false })
    .limit(1)
    .maybeSingle();

  if (!invitation) return { accepted: true };

  if (invitation.expires_at && new Date(invitation.expires_at) < new Date()) {
    const { error: expireError } = await admin
      .from("invitations")
      .update({ status: "expired" })
      .eq("id", invitation.id)
      .eq("status", "pending");

    if (expireError) {
      console.error("failed to mark invitation expired", invitation.id, expireError);
    }
    return { accepted: false, reason: "expired" };
  }

  const { error: inviteError } = await admin
    .from("invitations")
    .update({ status: "accepted", accepted_user_id: userId })
    .eq("id", invitation.id)
    .eq("status", "pending"); // guards against a double-accept race

  if (inviteError) {
    console.error("failed to mark invitation accepted", invitation.id, inviteError);
    return { accepted: true };
  }

  await admin.from("profiles").update({ status: "active" }).eq("id", userId);

  await admin
    .from("user_access_assignments")
    .update({ status: "active" })
    .eq("invitation_id", invitation.id)
    .eq("status", "invited");

  return { accepted: true };
}
