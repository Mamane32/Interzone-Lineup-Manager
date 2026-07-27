"use server";

import { revalidatePath } from "next/cache";
import { requireAdmin, getSessionUser } from "@/lib/access";
import { supabaseAdmin } from "@/lib/supabase-admin";
import { recordAuditEvent } from "@/lib/audit";
import type { AccessStatus, PlatformRole } from "@/lib/types";

export async function updateProfile(userId: string, formData: FormData) {
  await requireAdmin();
  const actor = await getSessionUser();

  const full_name = String(formData.get("full_name") ?? "").trim() || null;

  const admin = supabaseAdmin();
  await admin.from("profiles").update({ full_name }).eq("id", userId);

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
}

export async function addAssignment(userId: string, formData: FormData) {
  await requireAdmin();
  const actor = await getSessionUser();

  const role_key = String(formData.get("role_key") ?? "") as PlatformRole;
  const competition_id = String(formData.get("competition_id") ?? "") || null;
  const team_id = String(formData.get("team_id") ?? "") || null;
  if (!role_key) return;

  const admin = supabaseAdmin();
  const { data } = await admin
    .from("user_access_assignments")
    .insert({ user_id: userId, role_key, competition_id, team_id, status: "active" })
    .select("id")
    .single();

  if (actor) {
    await recordAuditEvent({
      actorUserId: actor.id,
      action: "access.assignment_created",
      targetType: "user_access_assignment",
      targetId: data?.id ?? null,
      metadata: { userId, role_key, competition_id, team_id },
    });
  }

  revalidatePath(`/admin/users/${userId}`);
  revalidatePath("/admin/access");
  revalidatePath("/admin/users");
}

export async function setAssignmentStatus(userId: string, assignmentId: string, status: AccessStatus) {
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

  revalidatePath(`/admin/users/${userId}`);
  revalidatePath("/admin/access");
  revalidatePath("/admin/users");
}
