"use server";

import { revalidatePath } from "next/cache";
import { requireAdmin, getSessionUser } from "@/lib/access";
import { supabaseAdmin } from "@/lib/supabase-admin";
import { recordAuditEvent } from "@/lib/audit";
import { isAccessStatus } from "@/lib/validation";
import { assertNotSelfLockout, assertAccountStatusChangeSafe } from "@/lib/privilege";
import type { AccessStatus } from "@/lib/types";

const ACTION_BY_STATUS: Record<AccessStatus, string> = {
  active: "user.activated",
  suspended: "user.suspended",
  disabled: "user.disabled",
  invited: "user.invited",
  archived: "user.archived",
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

  if (actor && (status === "disabled" || status === "suspended" || status === "archived")) {
    const guard = await assertNotSelfLockout(actor.id, userId, "account");
    if (!guard.ok) return { ok: false, error: guard.error };

    const lastAdminGuard = await assertAccountStatusChangeSafe(userId);
    if (!lastAdminGuard.ok) return { ok: false, error: lastAdminGuard.error };
  }

  const { error } = await admin.from("profiles").update({ status }).eq("id", userId);
  if (error) {
    console.error("updateUserStatus failed", userId, status, error);
    return { ok: false, error: "Could not update this account's status. Please try again." };
  }

  // Sprint 3 Phase 2: keep the originating invitation record's status
  // coherent with the account it created — an invitation shouldn't still
  // read "accepted" once the account behind it has been archived.
  if (status === "archived") {
    await admin.from("invitations").update({ status: "archived" }).eq("accepted_user_id", userId).eq("status", "accepted");
  } else if (status === "active") {
    // Reactivating a previously-archived account (Reactivate button)
    // reverses the propagation above, only for a row this reactivation
    // actually un-archives.
    await admin.from("invitations").update({ status: "accepted" }).eq("accepted_user_id", userId).eq("status", "archived");
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
