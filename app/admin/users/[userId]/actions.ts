"use server";

import { redirect } from "next/navigation";
import { revalidatePath } from "next/cache";
import { requireAdmin, getSessionUser } from "@/lib/access";
import { supabaseAdmin } from "@/lib/supabase-admin";
import { recordAuditEvent } from "@/lib/audit";
import { resolveAssignmentScope } from "@/lib/iam";
import { isAccessStatus, isPlatformRole } from "@/lib/validation";
import { assertCanManageRole, assertNotLastSuperAdmin, assertNotSelfLockout } from "@/lib/privilege";
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
    return { ok: false, error: "Could not update that assignment." };
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
