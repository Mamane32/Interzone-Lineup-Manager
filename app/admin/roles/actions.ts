"use server";

import { revalidatePath } from "next/cache";
import { requireAdmin, getSessionUser } from "@/lib/access";
import { supabaseAdmin } from "@/lib/supabase-admin";
import { recordAuditEvent } from "@/lib/audit";
import { isPlatformRole } from "@/lib/validation";
import type { PlatformRole } from "@/lib/types";

export async function updateRoleDescription(roleKey: PlatformRole, formData: FormData): Promise<void> {
  await requireAdmin();
  const actor = await getSessionUser();

  if (!isPlatformRole(roleKey)) {
    return;
  }

  const description = String(formData.get("description") ?? "").trim() || null;

  const admin = supabaseAdmin();
  const { error } = await admin.from("role_metadata").update({ description }).eq("role_key", roleKey);
  if (error) {
    console.error("updateRoleDescription failed", roleKey, error);
    return;
  }

  if (actor) {
    await recordAuditEvent({
      actorUserId: actor.id,
      action: "role.updated",
      targetType: "role",
      targetId: roleKey,
      metadata: { description },
    });
  }

  revalidatePath("/admin/roles");
}
