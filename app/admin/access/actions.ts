"use server";

import { redirect } from "next/navigation";
import { revalidatePath } from "next/cache";
import { requireAdmin, getSessionUser } from "@/lib/access";
import { supabaseAdmin } from "@/lib/supabase-admin";
import { recordAuditEvent } from "@/lib/audit";
import { resolveAssignmentScope, userExists } from "@/lib/iam";
import { isAccessStatus, isPlatformRole } from "@/lib/validation";
import { assertCanManageRole, assertNotLastSuperAdmin, assertNotSelfLockout } from "@/lib/privilege";
import type { AccessStatus, UserAccessAssignment } from "@/lib/types";

export type ActionResult = { ok: true } | { ok: false; error: string };

export async function createAssignment(formData: FormData) {
  const { role: actorRole } = await requireAdmin();
  const actor = await getSessionUser();

  const user_id = String(formData.get("user_id") ?? "");
  const roleInput = String(formData.get("role_key") ?? "");
  const competitionInput = String(formData.get("competition_id") ?? "") || null;
  const teamInput = String(formData.get("team_id") ?? "") || null;

  if (!user_id || !isPlatformRole(roleInput)) {
    redirect("/admin/access?error=missing-fields");
  }

  if (!(await userExists(user_id))) {
    redirect("/admin/access?error=not-found");
  }

  const roleCheck = assertCanManageRole(actorRole, roleInput);
  if (!roleCheck.ok) redirect("/admin/access?error=forbidden");

  const scope = await resolveAssignmentScope(roleInput, competitionInput, teamInput);
  if (!scope.ok) redirect("/admin/access?error=invalid-scope");

  const admin = supabaseAdmin();
  const { data, error } = await admin
    .from("user_access_assignments")
    .insert({ user_id, role_key: roleInput, competition_id: scope.competitionId, team_id: scope.teamId, status: "active" })
    .select("id")
    .single();

  if (error) {
    console.error("createAssignment failed", error);
    redirect("/admin/access?error=save-failed");
  }

  if (actor) {
    await recordAuditEvent({
      actorUserId: actor.id,
      action: "access.assignment_created",
      targetType: "user_access_assignment",
      targetId: data?.id ?? null,
      metadata: { user_id, role_key: roleInput, competition_id: scope.competitionId, team_id: scope.teamId },
    });
  }

  revalidatePath("/admin/access");
  revalidatePath("/admin/users");
  redirect("/admin/access?saved=1");
}

export async function updateAssignmentStatus(assignmentId: string, status: AccessStatus): Promise<ActionResult> {
  const { role: actorRole } = await requireAdmin();
  const actor = await getSessionUser();

  if (!isAccessStatus(status)) {
    return { ok: false, error: "Invalid status value." };
  }

  const admin = supabaseAdmin();
  const { data: assignment } = await admin
    .from("user_access_assignments")
    .select("*")
    .eq("id", assignmentId)
    .maybeSingle<UserAccessAssignment>();

  if (!assignment) return { ok: false, error: "That assignment no longer exists." };

  const roleCheck = assertCanManageRole(actorRole, assignment.role_key);
  if (!roleCheck.ok) return { ok: false, error: roleCheck.error };

  if (status !== "active") {
    const lastSuperAdminCheck = await assertNotLastSuperAdmin(assignment);
    if (!lastSuperAdminCheck.ok) return { ok: false, error: lastSuperAdminCheck.error };

    if (actor) {
      const selfCheck = await assertNotSelfLockout(actor.id, assignment.user_id, "assignment", assignment.role_key);
      if (!selfCheck.ok) return { ok: false, error: selfCheck.error };
    }
  }

  const { error } = await admin.from("user_access_assignments").update({ status }).eq("id", assignmentId);
  if (error) {
    console.error("updateAssignmentStatus failed", assignmentId, error);
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

  revalidatePath("/admin/access");
  revalidatePath("/admin/users");
  return { ok: true };
}
