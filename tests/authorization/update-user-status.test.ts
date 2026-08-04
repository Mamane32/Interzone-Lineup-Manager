import { beforeEach, describe, expect, it, vi } from "vitest";

const state = vi.hoisted(() => ({
  actorRole: "admin" as "admin" | "super_admin",
  actor: { id: "actor-1" } as { id: string } | null,
  targetAssignments: [] as Array<{ id: string; user_id: string; role_key: string; status: string }>,
  targetProfile: null as { id: string } | null,
  superAdminCount: 1,
}));

vi.mock("next/cache", () => ({ revalidatePath: vi.fn() }));

vi.mock("@/lib/access", () => ({
  requireAdmin: async () => ({ userId: state.actor?.id ?? "", role: state.actorRole }),
  getSessionUser: async () => state.actor,
  getActiveAssignments: async () => state.targetAssignments,
}));

vi.mock("@/lib/audit", () => ({ recordAuditEvent: async () => {} }));

vi.mock("@/lib/supabase-admin", () => ({
  supabaseAdmin: () => ({
    from: (table: string) => {
      if (table === "profiles") {
        return {
          select: () => ({ eq: () => ({ maybeSingle: async () => ({ data: state.targetProfile }) }) }),
          update: () => ({ eq: async () => ({ error: null }) }),
        };
      }
      if (table === "user_access_assignments") {
        return {
          select: () => ({ eq: () => ({ eq: async () => ({ count: state.superAdminCount }) }) }),
        };
      }
      throw new Error(`unexpected table ${table}`);
    },
  }),
}));

import { updateUserStatus } from "@/app/admin/users/actions";

describe("updateUserStatus account-level privilege guards", () => {
  beforeEach(() => {
    state.actorRole = "admin";
    state.actor = { id: "actor-1" };
    state.targetAssignments = [];
    state.targetProfile = { id: "target-1" };
    state.superAdminCount = 1;
  });

  it("blocks a plain administrator from disabling a super_admin's account", async () => {
    state.targetAssignments = [{ id: "a1", user_id: "target-1", role_key: "super_admin", status: "active" }];

    await expect(updateUserStatus("target-1", "disabled")).resolves.toEqual({
      ok: false,
      error: "Only a super administrator may manage super administrator access.",
    });
  });

  it("blocks disabling the platform's last active super_admin, even when the actor is a super_admin", async () => {
    state.actorRole = "super_admin";
    state.targetAssignments = [{ id: "a1", user_id: "target-1", role_key: "super_admin", status: "active" }];
    state.superAdminCount = 1;

    const result = await updateUserStatus("target-1", "disabled");
    expect(result.ok).toBe(false);
    if (!result.ok) {
      expect(result.error).toMatch(/last active super administrator/);
    }
  });

  it("allows a super_admin to disable another super_admin's account when a second one still exists", async () => {
    state.actorRole = "super_admin";
    state.actor = { id: "actor-1" };
    state.targetAssignments = [{ id: "a1", user_id: "target-1", role_key: "super_admin", status: "active" }];
    state.superAdminCount = 2;

    await expect(updateUserStatus("target-1", "disabled")).resolves.toEqual({ ok: true });
  });

  it("still allows an ordinary administrator to disable a non-admin user's account", async () => {
    state.targetAssignments = [{ id: "a1", user_id: "target-1", role_key: "coach", status: "active" }];

    await expect(updateUserStatus("target-1", "disabled")).resolves.toEqual({ ok: true });
  });
});
