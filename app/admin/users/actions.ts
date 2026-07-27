"use server";

import { revalidatePath } from "next/cache";
import { requireAdmin, getSessionUser } from "@/lib/access";
import { supabaseAdmin } from "@/lib/supabase-admin";
import { recordAuditEvent } from "@/lib/audit";
import type { AccessStatus } from "@/lib/types";

const ACTION_BY_STATUS: Record<AccessStatus, string> = {
  active: "user.activated",
  suspended: "user.suspended",
  disabled: "user.disabled",
  archived: "user.archived",
  invited: "user.invited",
};

export async function updateUserStatus(userId: string, status: AccessStatus) {
  await requireAdmin();
  const actor = await getSessionUser();

  const admin = supabaseAdmin();
  await admin.from("profiles").update({ status }).eq("id", userId);

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
}
