"use server";

import { revalidatePath } from "next/cache";
import { requireAdmin, getSessionUser } from "@/lib/access";
import { supabaseAdmin } from "@/lib/supabase-admin";
import { recordAuditEvent } from "@/lib/audit";
import type { PlatformRole } from "@/lib/types";

export async function updateRoleDescription(roleKey: PlatformRole, formData: FormData) {
  await requireAdmin();
  const actor = await getSessionUser();

  const description = String(formData.get("description") ?? "").trim() || null;

  const admin = supabaseAdmin();
  await admin.from("role_metadata").update({ description }).eq("role_key", roleKey);

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
