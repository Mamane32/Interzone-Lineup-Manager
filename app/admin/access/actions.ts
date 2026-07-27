"use server";

import { revalidatePath } from "next/cache";
import { requireAdmin, getSessionUser } from "@/lib/access";
import { supabaseAdmin } from "@/lib/supabase-admin";
import { recordAuditEvent } from "@/lib/audit";
import type { AccessStatus, PlatformRole } from "@/lib/types";

export async function createAssignment(formData: FormData) {
  await requireAdmin();
  const actor = await getSessionUser();

  const user_id = String(formData.get("user_id") ?? "");
  const role_key = String(formData.get("role_key") ?? "") as PlatformRole;
  const competition_id = String(formData.get("competition_id") ?? "") || null;
  const team_id = String(formData.get("team_id") ?? "") || null;
  if (!user_id || !role_key) return;

  const admin = supabaseAdmin();
  const { data } = await admin
    .from("user_access_assignments")
    .insert({ user_id, role_key, competition_id, team_id, status: "active" })
    .select("id")
    .single();

  if (actor) {
    await recordAuditEvent({
      actorUserId: actor.id,
      action: "access.assignment_created",
      targetType: "user_access_assignment",
      targetId: data?.id ?? null,
      metadata: { user_id, role_key, competition_id, team_id },
    });
  }

  revalidatePath("/admin/access");
  revalidatePath("/admin/users");
}

export async function updateAssignmentStatus(assignmentId: string, status: AccessStatus) {
  await requireAdmin();
  const actor = await getSessionUser();

  const admin = supabaseAdmin();
  await admin.from("user_access_assignments").update({ status }).eq("id", assignmentId);

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
}
