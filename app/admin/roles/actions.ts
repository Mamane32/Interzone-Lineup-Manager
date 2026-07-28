"use server";

import { revalidatePath } from "next/cache";
import { requireAdmin, getSessionUser } from "@/lib/access";
import { supabaseAdmin } from "@/lib/supabase-admin";
import { recordAuditEvent } from "@/lib/audit";
import { isPlatformRole } from "@/lib/validation";
import type { PlatformRole } from "@/lib/types";

export type ActionResult = { ok: true } | { ok: false; error: string };

export async function updateRoleDescription(roleKey: PlatformRole, formData: FormData): Promise<ActionResult> {
  await requireAdmin();
  const actor = await getSessionUser();

  if (!isPlatformRole(roleKey)) {
    return { ok: false, error: "Invalid role." };
  }

  const description = String(formData.get("description") ?? "").trim() || null;

  const admin = supabaseAdmin();
  const { error } = await admin.from("role_metadata").update({ description }).eq("role_key", roleKey);
  if (error) {
    console.error("updateRoleDescription failed", roleKey, error);
    return { ok: false, error: "Could not save that description." };
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
  return { ok: true };
}
