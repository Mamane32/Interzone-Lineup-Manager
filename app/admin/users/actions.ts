"use server";

import { revalidatePath } from "next/cache";
import { requireAdmin, getSessionUser, getActiveAssignments } from "@/lib/access";
import { supabaseAdmin } from "@/lib/supabase-admin";
import { recordAuditEvent } from "@/lib/audit";
import { isAccessStatus } from "@/lib/validation";
import { assertCanManageRole, assertNotLastSuperAdmin, assertNotSelfLockout } from "@/lib/privilege";
import type { AccessStatus } from "@/lib/types";

const ACTION_BY_STATUS: Record<AccessStatus, string> = {
  active: "user.activated",
  suspended: "user.suspended",
  disabled: "user.disabled",
  invited: "user.invited",
};

export type UpdateUserStatusResult = { ok: true } | { ok: false; error: string };

export async function updateUserStatus(userId: string, status: AccessStatus): Promise<UpdateUserStatusResult> {
  const { role: actorRole } = await requireAdmin();
  const actor = await getSessionUser();

  if (!isAccessStatus(status)) {
    return { ok: false, error: "Invalid status value." };
  }

  const admin = supabaseAdmin();
  const { data: target } = await admin.from("profiles").select("id").eq("id", userId).maybeSingle();
  if (!target) {
    return { ok: false, error: "That user no longer exists." };
  }

  // This changes the WHOLE account's status, which is at least as powerful
  // as revoking every individual assignment the account holds — so it must
  // carry the same guards assignment-level changes already have (see
  // lib/privilege.ts): only a super_admin may touch a super_admin's
  // account, and the platform's last active super_admin can never be
  // locked out this way, even by another super_admin.
  const targetAssignments = await getActiveAssignments(userId);
  const targetSuperAdminAssignment = targetAssignments.find((a) => a.role_key === "super_admin");
  if (targetSuperAdminAssignment) {
    const roleCheck = assertCanManageRole(actorRole, "super_admin");
    if (!roleCheck.ok) return { ok: false, error: roleCheck.error };

    if (status !== "active") {
      const lastSuperAdminCheck = await assertNotLastSuperAdmin(targetSuperAdminAssignment);
      if (!lastSuperAdminCheck.ok) return { ok: false, error: lastSuperAdminCheck.error };
    }
  }

  if (actor && (status === "disabled" || status === "suspended")) {
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
