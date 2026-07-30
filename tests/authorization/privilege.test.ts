import { describe, expect, it, vi } from "vitest";

vi.mock("@/lib/supabase-admin", () => ({
  supabaseAdmin: vi.fn(),
}));

import { assertCanManageRole, assertNotSelfLockout } from "@/lib/privilege";

describe("privilege guard characterization", () => {
  it("allows only super administrators to manage super-administrator grants", () => {
    expect(assertCanManageRole("admin", "super_admin")).toEqual({
      ok: false,
      error: "Only a super administrator may manage super administrator access.",
    });
    expect(assertCanManageRole("super_admin", "super_admin")).toEqual({ ok: true });
  });

  it("blocks administrators from disabling their own account", async () => {
    await expect(assertNotSelfLockout("user-1", "user-1", "account")).resolves.toEqual({
      ok: false,
      error: "You cannot suspend, disable, or archive your own account.",
    });
  });

  it("does not block account changes targeting another user", async () => {
    await expect(assertNotSelfLockout("actor", "target", "account")).resolves.toEqual({ ok: true });
  });
});
