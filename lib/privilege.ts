import "server-only";
import { supabaseAdmin } from "@/lib/supabase-admin";
import type { PlatformRole } from "@/lib/types";

const ADMIN_CAPABLE_ROLES: PlatformRole[] = ["admin", "super_admin"];

export type PrivilegeCheckResult = { ok: true } | { ok: false; error: string };

export async function countActiveUsersWithRole(roleKey: PlatformRole): Promise<number> {
  const admin = supabaseAdmin();
  const { count } = await admin
    .from("user_access_assignments")
    .select("id", { count: "exact", head: true })
    .eq("role_key", roleKey)
    .eq("status", "active");
  return count ?? 0;
}

/**
 * Only a super_admin may grant, modify, or revoke anything scoped to the
 * super_admin role. A normal admin acting on a super_admin's account or
 * assignment is blocked here, before any write happens.
 */
export function assertCanManageRole(actorRole: PlatformRole, targetRole: PlatformRole): PrivilegeCheckResult {
  if (targetRole === "super_admin" && actorRole !== "super_admin") {
    return { ok: false, error: "Only a super administrator may manage super administrator access." };
  }
  return { ok: true };
}

/**
 * Blocks suspending/disabling/revoking the platform's last active
 * super_admin assignment, regardless of who the actor is — this protects
 * the platform even from another super_admin doing it by mistake.
 */
export async function assertNotLastSuperAdmin(assignment: { role_key: PlatformRole; status: string }): Promise<PrivilegeCheckResult> {
  if (assignment.role_key !== "super_admin" || assignment.status !== "active") return { ok: true };
  const count = await countActiveUsersWithRole("super_admin");
  if (count <= 1) {
    return {
      ok: false,
      error: "This is the platform's last active super administrator. Grant super_admin to another account before removing this one.",
    };
  }
  return { ok: true };
}

/**
 * Blocks an administrator from locking themselves out: disabling/archiving
 * their own account outright, or revoking/suspending their own last
 * admin-capable (admin/super_admin) assignment.
 */
export async function assertNotSelfLockout(
  actorUserId: string,
  targetUserId: string,
  kind: "account" | "assignment",
  assignmentRole?: PlatformRole
): Promise<PrivilegeCheckResult> {
  if (actorUserId !== targetUserId) return { ok: true };

  if (kind === "account") {
    return { ok: false, error: "You cannot suspend, disable, or archive your own account." };
  }

  if (assignmentRole && ADMIN_CAPABLE_ROLES.includes(assignmentRole)) {
    const admin = supabaseAdmin();
    const { data } = await admin
      .from("user_access_assignments")
      .select("id")
      .eq("user_id", actorUserId)
      .eq("status", "active")
      .in("role_key", ADMIN_CAPABLE_ROLES);
    if ((data ?? []).length <= 1) {
      return { ok: false, error: "You cannot revoke or suspend your own last administrative assignment." };
    }
  }

  return { ok: true };
}
