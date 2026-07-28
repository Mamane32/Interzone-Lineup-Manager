"use server";

import { revalidatePath } from "next/cache";
import { requireAdmin, getSessionUser } from "@/lib/access";
import { supabaseAdmin } from "@/lib/supabase-admin";
import { recordAuditEvent } from "@/lib/audit";
import { isAccessStatus } from "@/lib/validation";
import { assertNotSelfLockout } from "@/lib/privilege";
import type { AccessStatus } from "@/lib/types";

const ACTION_BY_STATUS: Record<AccessStatus, string> = {
  active: "user.activated",
  suspended: "user.suspended",
  disabled: "user.disabled",
  archived: "user.archived",
  invited: "user.invited",
};

export type UpdateUserStatusResult = { ok: true } | { ok: false; error: string };

export async function updateUserStatus(userId: string, status: AccessStatus): Promise<UpdateUserStatusResult> {
  await requireAdmin();
  const actor = await getSessionUser();

  if (!isAccessStatus(status)) {
    return { ok: false, error: "Invalid status value." };
  }

  const admin = supabaseAdmin();
  const { data: target } = await admin.from("profiles").select("id").eq("id", userId).maybeSingle();
  if (!target) {
    return { ok: false, error: "That user no longer exists." };
  }

  if (actor && (status === "disabled" || status === "archived" || status === "suspended")) {
    const guard = await assertNotSelfLockout(actor.id, userId, "account");
    if (!guard.ok) return { ok: false, error: guard.error };
  }

  const { error } = await admin.from("profiles").update({ status }).eq("id", userId);
  if (error) {
    console.error("updateUserStatus failed", userId, status, error);
    return { ok: false, error: "Could not update this account's status. Please try again." };
  }

  if (actor) {
    await recordAuditEvent({
      actorUserId: actor.id,
      action: ACTION_BY_STATUS[status],
      targetType: "user",
      targetId: userId,
      metadata: { status },
    });
  }

  revalidatePath("/admin/users");
  revalidatePath(`/admin/users/${userId}`);
  return { ok: true };
}
