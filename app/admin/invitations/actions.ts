"use server";

import { redirect } from "next/navigation";
import { revalidatePath } from "next/cache";
import { requireAdmin, getSessionUser } from "@/lib/access";
import { supabaseAdmin } from "@/lib/supabase-admin";
import { recordAuditEvent } from "@/lib/audit";
import { resolveAssignmentScope } from "@/lib/iam";
import { isPlatformRole } from "@/lib/validation";
import { assertCanManageRole } from "@/lib/privilege";
import { createInvitation, resendInvitationCore } from "@/lib/invitation-service";
import { lockOutUser, restoreUserAccess } from "@/lib/auth-admin";
import { deleteUserIdentity } from "@/lib/user-deletion";
import type { Invitation } from "@/lib/types";

export async function inviteUser(formData: FormData) {
  const { role: actorRole } = await requireAdmin();
  const actor = await getSessionUser();

  const email = String(formData.get("email") ?? "").trim().toLowerCase();
  const full_name = String(formData.get("full_name") ?? "").trim() || null;
  const roleInput = String(formData.get("role_key") ?? "");
  const competitionInput = String(formData.get("competition_id") ?? "") || null;
  const teamInput = String(formData.get("team_id") ?? "") || null;
  const message = String(formData.get("message") ?? "").trim() || null;
  const expiresAtRaw = String(formData.get("expires_at") ?? "");
  const expires_at = expiresAtRaw ? new Date(expiresAtRaw).toISOString() : null;

  if (!email || !isPlatformRole(roleInput)) {
    redirectWithError("missing-fields");
  }
  const role_key = roleInput;

  const roleCheck = assertCanManageRole(actorRole, role_key);
  if (!roleCheck.ok) redirectWithError("forbidden");

  const scope = await resolveAssignmentScope(role_key, competitionInput, teamInput);
  if (!scope.ok) redirectWithError("invalid-scope");

  const result = await createInvitation({
    email,
    full_name,
    role_key,
    competition_id: scope.competitionId,
    team_id: scope.teamId,
    message,
    expires_at,
    invited_by: actor?.id ?? null,
    redirectPath: "/team/reset-password",
  });

  if (!result.ok) {
    if (actor && result.reason !== "save-failed") {
      const metadata =
        result.reason === "email-failed"
          ? { email, role_key, sent: false, error: result.authErrorMessage }
          : { email, role_key, sent: true, setupError: true };
      await recordAuditEvent({
        actorUserId: actor.id,
        action: "user.invited",
        targetType: "invitation",
        targetId: result.invitation.id,
        metadata,
      });
    }
    revalidatePath("/admin/invitations");
    redirectWithError(result.reason);
  }

  if (actor) {
    await recordAuditEvent({
      actorUserId: actor.id,
      action: "user.invited",
      targetType: "invitation",
      targetId: result.invitation.id,
      metadata: { email, role_key, sent: true },
    });
  }

  revalidatePath("/admin/invitations");
  revalidatePath("/admin/users");
  redirectWithSuccess();
}

export async function resendInvitation(invitationId: string) {
  const { role: actorRole } = await requireAdmin();
  const actor = await getSessionUser();

  const admin = supabaseAdmin();
  const { data: invite } = await admin.from("invitations").select("*").eq("id", invitationId).maybeSingle<Invitation>();
  if (!invite) redirectWithError("not-found");
  if (invite!.status !== "pending" && invite!.status !== "expired") redirectWithError("not-pending");

  const roleCheck = assertCanManageRole(actorRole, invite!.role_key);
  if (!roleCheck.ok) redirectWithError("forbidden");

  const result = await resendInvitationCore(invite!);

  if (actor) {
    await recordAuditEvent({
      actorUserId: actor.id,
      action: "invitation.resent",
      targetType: "invitation",
      targetId: invitationId,
      metadata: { email: invite!.email, sent: result.ok, error: result.ok ? null : result.errorMessage },
    });
  }

  if (!result.ok) {
    console.error("resend invitation failed", invitationId, result.errorMessage);
    revalidatePath("/admin/invitations");
    redirectWithError("email-failed");
  }

  revalidatePath("/admin/invitations");
  redirect(`/admin/invitations?resent=1`);
}

export async function revokeInvitation(invitationId: string) {
  const { role: actorRole } = await requireAdmin();
  const actor = await getSessionUser();

  const admin = supabaseAdmin();
  const { data: invite } = await admin.from("invitations").select("*").eq("id", invitationId).maybeSingle<Invitation>();
  if (!invite) redirectWithError("not-found");

  // Only a still-pending or expired invitation can be revoked this way. An
  // already accepted invitation belongs to a real, active user now — use
  // the Users page (suspend/disable) for that, which never touches
  // "unrelated" assignments this account may have picked up since.
  if (invite!.status !== "pending" && invite!.status !== "expired") redirectWithError("not-pending");

  const roleCheck = assertCanManageRole(actorRole, invite!.role_key);
  if (!roleCheck.ok) redirectWithError("forbidden");

  const { error: revokeError } = await admin
    .from("invitations")
    .update({ status: "revoked" })
    .eq("id", invitationId)
    .in("status", ["pending", "expired"]);

  if (revokeError) {
    console.error("revoke invitation failed", invitationId, revokeError);
    redirectWithError("save-failed");
  }

  // Cascade: disable exactly the assignments this invitation created —
  // never anything the user might separately hold.
  await admin
    .from("user_access_assignments")
    .update({ status: "disabled" })
    .eq("invitation_id", invitationId)
    .eq("status", "invited");

  // The invited profile must not retain platform access. Only touches a
  // profile still in 'invited' status — if it's somehow already active
  // (e.g. a race with acceptance), this deliberately leaves it alone rather
  // than disabling a real accepted user out from under them.
  if (invite!.invited_user_id) {
    await admin
      .from("profiles")
      .update({ status: "disabled" })
      .eq("id", invite!.invited_user_id)
      .eq("status", "invited");

    // Ban the unaccepted Supabase Auth account rather than deleting it
    // (Sprint 3 Phase 2 redesign) — Revoke must be reversible via Restore.
    // Deleting it here, as the previous implementation did, destroyed the
    // account outright and made Restore impossible to build on top of.
    // Best-effort: a failure here doesn't block the rest of the revoke
    // (the assignment/profile changes above already remove platform access
    // regardless).
    const lockResult = await lockOutUser(invite!.invited_user_id);
    if (!lockResult.ok) {
      console.error("failed to lock out revoked invited auth user", invite!.invited_user_id);
    }
  }

  if (actor) {
    await recordAuditEvent({
      actorUserId: actor.id,
      action: "invitation.revoked",
      targetType: "invitation",
      targetId: invitationId,
      metadata: { email: invite!.email },
    });
  }

  revalidatePath("/admin/invitations");
  revalidatePath("/admin/users");
  revalidatePath("/admin/access");
  redirect(`/admin/invitations?revoked=1`);
}

/**
 * Reverses a Revoke: only reachable from `revoked`. Reactivates the
 * assignment(s)/profile back to `invited`, the invitation back to
 * `pending`, and unbans the Auth account (lifted by revokeInvitation's
 * lockOutUser above) — no new Auth account is created, since revoke no
 * longer destroys it. Sends a fresh recovery link since the original
 * invite email is presumably long gone.
 */
export async function restoreInvitation(invitationId: string) {
  const { role: actorRole } = await requireAdmin();
  const actor = await getSessionUser();

  const admin = supabaseAdmin();
  const { data: invite } = await admin.from("invitations").select("*").eq("id", invitationId).maybeSingle<Invitation>();
  if (!invite) redirectWithError("not-found");
  if (invite!.status !== "revoked") redirectWithError("not-revoked");

  const roleCheck = assertCanManageRole(actorRole, invite!.role_key);
  if (!roleCheck.ok) redirectWithError("forbidden");

  const { error: restoreError } = await admin
    .from("invitations")
    .update({ status: "pending" })
    .eq("id", invitationId)
    .eq("status", "revoked");

  if (restoreError) {
    console.error("restore invitation failed", invitationId, restoreError);
    redirectWithError("save-failed");
  }

  let sent = false;
  if (invite!.invited_user_id) {
    await admin
      .from("user_access_assignments")
      .update({ status: "invited" })
      .eq("invitation_id", invitationId)
      .eq("status", "disabled");

    await admin.from("profiles").update({ status: "invited" }).eq("id", invite!.invited_user_id).eq("status", "disabled");

    const unbanResult = await restoreUserAccess(invite!.invited_user_id);
    if (!unbanResult.ok) {
      console.error("failed to unban restored invited auth user", invite!.invited_user_id);
    }

    const result = await resendInvitationCore(invite!);
    sent = result.ok;
    if (!result.ok) {
      console.error("restore invitation: recovery email failed", invitationId, result.errorMessage);
    }
  }

  if (actor) {
    await recordAuditEvent({
      actorUserId: actor.id,
      action: "invitation.restored",
      targetType: "invitation",
      targetId: invitationId,
      metadata: { email: invite!.email, sent },
    });
  }

  revalidatePath("/admin/invitations");
  revalidatePath("/admin/users");
  revalidatePath("/admin/access");
  redirect(`/admin/invitations?restored=1`);
}

/**
 * Permanently removes an invitation and its never-accepted Auth account.
 * Only reachable from `revoked`, and only when the invitation was never
 * accepted (`accepted_user_id` is null) — an invitation that was ever
 * accepted belongs to a real user with real history and must never be
 * deletable through this path (see Sprint 3 Phase 2 Master Plan §3.1: a
 * never-accepted invitation's user can have no linked business data,
 * because every access gate in this app requires `status = 'active'`,
 * which an unaccepted invitation's profile/assignment never reach).
 */
/**
 * Permanent, complete removal — reachable only from `revoked`, same as
 * before. The earlier "never for an accepted invitation" restriction is
 * deliberately removed: this is now official platform policy (explicitly
 * reversed) — Delete means the identity never existed, Revoke stays the
 * temporary, reversible action. Uses the shared deleteUserIdentity core
 * (lib/user-deletion.ts) also used by the Users page's deleteUser, so an
 * accepted user deleted via either entry point behaves identically.
 */
export async function deleteInvitation(invitationId: string) {
  const { role: actorRole } = await requireAdmin();
  const actor = await getSessionUser();

  const admin = supabaseAdmin();
  const { data: invite } = await admin.from("invitations").select("*").eq("id", invitationId).maybeSingle<Invitation>();
  if (!invite) redirectWithError("not-found");
  if (invite!.status !== "revoked") redirectWithError("not-revoked");

  const roleCheck = assertCanManageRole(actorRole, invite!.role_key);
  if (!roleCheck.ok) redirectWithError("forbidden");

  const identityUserId = invite!.invited_user_id ?? invite!.accepted_user_id;
  if (identityUserId) {
    // deleteUserIdentity already removes this invitation row (and every
    // other invitation tied to this identity) as part of its own cleanup —
    // no separate invitations.delete() needed once an identity exists.
    const result = await deleteUserIdentity(identityUserId);
    if (!result.ok) {
      console.error("delete invitation failed", invitationId, result.error);
      redirectWithError("save-failed");
    }
  } else {
    // No identity was ever created for this invitation (e.g. the original
    // inviteUserByEmail call failed) — just remove the bare row.
    const { error: deleteError } = await admin.from("invitations").delete().eq("id", invitationId).eq("status", "revoked");
    if (deleteError) {
      console.error("delete invitation failed", invitationId, deleteError);
      redirectWithError("save-failed");
    }
  }

  if (actor) {
    // Recorded with targetId still pointing at the now-deleted invitation
    // id — audit_events does not require the target to still exist, so
    // this row remains as the permanent record that the deletion happened.
    await recordAuditEvent({
      actorUserId: actor.id,
      action: "invitation.deleted",
      targetType: "invitation",
      targetId: invitationId,
      metadata: { email: invite!.email },
    });
  }

  revalidatePath("/admin/invitations");
  revalidatePath("/admin/users");
  redirect(`/admin/invitations?deleted=1`);
}

// --- helpers ---------------------------------------------------------------

function redirectWithError(reason: string): never {
  redirect(`/admin/invitations?error=${reason}`);
}
function redirectWithSuccess(): never {
  redirect(`/admin/invitations?sent=1`);
}
