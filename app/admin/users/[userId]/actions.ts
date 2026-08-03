"use server";

import { redirect } from "next/navigation";
import { revalidatePath } from "next/cache";
import { requireAdmin, getSessionUser } from "@/lib/access";
import { supabaseAdmin } from "@/lib/supabase-admin";
import { recordAuditEvent } from "@/lib/audit";
import { resolveAssignmentScope } from "@/lib/iam";
import { isAccessStatus, isPlatformRole } from "@/lib/validation";
import { assertCanManageRole, assertNotLastSuperAdmin, assertNotSelfLockout, assertAccountStatusChangeSafe } from "@/lib/privilege";
import { classifyResetError } from "@/lib/auth-rate-limit";
import { lockOutUser, restoreUserAccess } from "@/lib/auth-admin";
import { deleteUserIdentity } from "@/lib/user-deletion";
import type { AccessStatus, UserAccessAssignment } from "@/lib/types";

export type ActionResult = { ok: true } | { ok: false; error: string };

export async function updateProfile(userId: string, formData: FormData) {
  await requireAdmin();
  const actor = await getSessionUser();

  const full_name = String(formData.get("full_name") ?? "").trim() || null;

  const admin = supabaseAdmin();
  const { data: target } = await admin.from("profiles").select("id").eq("id", userId).maybeSingle();
  if (!target) redirect(`/admin/users/${userId}?error=not-found`);

  const { error } = await admin.from("profiles").update({ full_name }).eq("id", userId);
  if (error) {
    console.error("updateProfile failed", userId, error);
    redirect(`/admin/users/${userId}?error=save-failed`);
  }

  if (actor) {
    await recordAuditEvent({
      actorUserId: actor.id,
      action: "user.profile_updated",
      targetType: "user",
      targetId: userId,
      metadata: { full_name },
    });
  }

  revalidatePath(`/admin/users/${userId}`);
  redirect(`/admin/users/${userId}?saved=1`);
}

export async function addAssignment(userId: string, formData: FormData) {
  const { role: actorRole } = await requireAdmin();
  const actor = await getSessionUser();

  const roleInput = String(formData.get("role_key") ?? "");
  const competitionInput = String(formData.get("competition_id") ?? "") || null;
  const teamInput = String(formData.get("team_id") ?? "") || null;

  if (!isPlatformRole(roleInput)) {
    redirect(`/admin/users/${userId}?error=invalid-role`);
  }

  const admin = supabaseAdmin();
  const { data: target } = await admin.from("profiles").select("id").eq("id", userId).maybeSingle();
  if (!target) redirect(`/admin/users/${userId}?error=not-found`);

  const roleCheck = assertCanManageRole(actorRole, roleInput);
  if (!roleCheck.ok) redirect(`/admin/users/${userId}?error=forbidden`);

  const scope = await resolveAssignmentScope(roleInput, competitionInput, teamInput);
  if (!scope.ok) redirect(`/admin/users/${userId}?error=invalid-scope`);

  const { data, error } = await admin
    .from("user_access_assignments")
    .insert({ user_id: userId, role_key: roleInput, competition_id: scope.competitionId, team_id: scope.teamId, status: "active" })
    .select("id")
    .single();

  if (error) {
    console.error("addAssignment failed", userId, error);
    redirect(`/admin/users/${userId}?error=save-failed`);
  }

  if (actor) {
    await recordAuditEvent({
      actorUserId: actor.id,
      action: "access.assignment_created",
      targetType: "user_access_assignment",
      targetId: data?.id ?? null,
      metadata: { userId, role_key: roleInput, competition_id: scope.competitionId, team_id: scope.teamId },
    });
  }

  revalidatePath(`/admin/users/${userId}`);
  revalidatePath("/admin/access");
  revalidatePath("/admin/users");
  redirect(`/admin/users/${userId}?saved=1`);
}

export async function setAssignmentStatus(userId: string, assignmentId: string, status: AccessStatus): Promise<ActionResult> {
  const { role: actorRole } = await requireAdmin();
  const actor = await getSessionUser();

  if (!isAccessStatus(status)) {
    return { ok: false, error: "Invalid status value." };
  }

  const admin = supabaseAdmin();

  // Ownership check (hardening item 8): the assignment must actually
  // belong to the user this page is for — never update by assignment id
  // alone just because we're revalidating that user's page.
  const { data: assignment } = await admin
    .from("user_access_assignments")
    .select("*")
    .eq("id", assignmentId)
    .maybeSingle<UserAccessAssignment>();

  if (!assignment) return { ok: false, error: "That assignment no longer exists." };
  if (assignment.user_id !== userId) {
    return { ok: false, error: "That assignment does not belong to this user." };
  }

  const roleCheck = assertCanManageRole(actorRole, assignment.role_key);
  if (!roleCheck.ok) return { ok: false, error: roleCheck.error };

  if (status !== "active") {
    const lastSuperAdminCheck = await assertNotLastSuperAdmin(assignment);
    if (!lastSuperAdminCheck.ok) return { ok: false, error: lastSuperAdminCheck.error };

    if (actor) {
      const selfCheck = await assertNotSelfLockout(actor.id, userId, "assignment", assignment.role_key);
      if (!selfCheck.ok) return { ok: false, error: selfCheck.error };
    }
  }

  const { error } = await admin
    .from("user_access_assignments")
    .update({ status })
    .eq("id", assignmentId)
    .eq("user_id", userId);

  if (error) {
    console.error("setAssignmentStatus failed", assignmentId, error);
    return { ok: false, error: "Could not update that assignment. Please try again." };
  }

  if (actor) {
    await recordAuditEvent({
      actorUserId: actor.id,
      action: status === "active" ? "access.assignment_activated" : "access.assignment_revoked",
      targetType: "user_access_assignment",
      targetId: assignmentId,
      metadata: { status },
    });
  }

  revalidatePath(`/admin/users/${userId}`);
  revalidatePath("/admin/access");
  revalidatePath("/admin/users");
  return { ok: true };
}

/**
 * Admin-triggered password reset with immediate session invalidation —
 * distinct from the self-service forgot-password flows
 * (app/login/actions.ts, app/team/[token]/forgot-password/actions.ts).
 * Only available for 'active' or 'suspended' accounts (an invited/expired/
 * revoked/archived account has no meaningful password to reset, or
 * shouldn't be reachable at all). Locks the account out via
 * lib/auth-admin.ts's lockOutUser before sending the email — every
 * existing session is rejected on its next request through
 * lib/supabase/middleware.ts's live getUser() check — and the lockout is
 * lifted automatically the moment the person completes the reset (see
 * app/team/reset-password/actions.ts's setNewPassword).
 */
export async function forcePasswordReset(userId: string): Promise<ActionResult> {
  await requireAdmin();
  const actor = await getSessionUser();

  const admin = supabaseAdmin();
  const { data: target } = await admin.from("profiles").select("id, email, status").eq("id", userId).maybeSingle();
  if (!target) return { ok: false, error: "That user no longer exists." };

  if (target.status !== "active" && target.status !== "suspended") {
    return { ok: false, error: "Password reset is only available for active or suspended accounts." };
  }

  const lockout = await lockOutUser(userId);
  if (!lockout.ok) {
    return { ok: false, error: "Could not lock out this account. Please try again." };
  }

  const appUrl = (process.env.NEXT_PUBLIC_APP_URL ?? "").replace(/\/$/, "");
  const { error } = await admin.auth.resetPasswordForEmail(target.email, {
    redirectTo: `${appUrl}/auth/callback?next=${encodeURIComponent("/team/reset-password")}`,
  });

  const classification = classifyResetError(error);
  if (classification) {
    console.error("forcePasswordReset: resetPasswordForEmail failed", {
      email: target.email,
      code: (error as { code?: string } | null)?.code,
      status: error?.status,
      message: error?.message,
      classification,
    });
    // The reset email didn't go out — don't leave the account locked out
    // with no way back in.
    await restoreUserAccess(userId);
    return {
      ok: false,
      error:
        classification === "rate_limited"
          ? "Too many reset emails sent recently. Try again in a few minutes."
          : "Could not send the reset email. Please try again.",
    };
  }

  if (actor) {
    await recordAuditEvent({
      actorUserId: actor.id,
      action: "user.password_reset_forced",
      targetType: "user",
      targetId: userId,
      metadata: { email: target.email },
    });
  }

  revalidatePath(`/admin/users/${userId}`);
  return { ok: true };
}

/**
 * Permanent, complete removal — official platform policy (Sprint 3 Phase
 * 2), deliberately reversing the earlier "Delete is never available for
 * accepted users" rule. Distinct from every status change above: those are
 * all reversible (Suspend/Disable/Archive keep the record; Restore exists
 * for invitations). This does not. Reachable regardless of the account's
 * current status — an admin doesn't have to disable/suspend first.
 *
 * Uses the same shared deleteUserIdentity core (lib/user-deletion.ts) the
 * Invitations page's deleteInvitation uses, so a user deleted from either
 * entry point behaves identically: every invitation tied to this identity
 * is removed, and profiles/user_access_assignments are removed via
 * Postgres's own ON DELETE CASCADE from auth.users (confirmed directly
 * against supabase/schema.sql) rather than deleted here by hand.
 */
export async function deleteUser(userId: string): Promise<ActionResult> {
  await requireAdmin();
  const actor = await getSessionUser();

  const admin = supabaseAdmin();
  const { data: target } = await admin.from("profiles").select("id, email").eq("id", userId).maybeSingle();
  if (!target) return { ok: false, error: "That user no longer exists." };

  if (actor) {
    const selfCheck = await assertNotSelfLockout(actor.id, userId, "account");
    if (!selfCheck.ok) return { ok: false, error: selfCheck.error };
  }

  const lastAdminCheck = await assertAccountStatusChangeSafe(userId);
  if (!lastAdminCheck.ok) return { ok: false, error: lastAdminCheck.error };

  const result = await deleteUserIdentity(userId);
  if (!result.ok) return result;

  if (actor) {
    // targetId still points at the now-deleted user id — audit_logs does
    // not require the target to still exist (target_id has no foreign key,
    // see supabase/schema.sql), so this row remains as the permanent record
    // that the deletion happened, with the email captured in metadata
    // since profiles.email is gone.
    await recordAuditEvent({
      actorUserId: actor.id,
      action: "user.deleted",
      targetType: "user",
      targetId: userId,
      metadata: { email: target.email },
    });
  }

  revalidatePath("/admin/users");
  revalidatePath("/admin/invitations");
  revalidatePath("/admin/access");
  redirect("/admin/users?deleted=1");
}
