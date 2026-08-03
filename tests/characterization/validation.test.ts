import { describe, expect, it } from "vitest";
import {
  ACCESS_STATUSES,
  PLATFORM_ROLES,
  isAccessStatus,
  isInvitationStatus,
  isPlatformRole,
} from "@/lib/validation";

describe("IAM vocabulary characterization", () => {
  it("preserves the eight platform roles", () => {
    expect(PLATFORM_ROLES).toEqual([
      "super_admin",
      "admin",
      "competition_manager",
      "broadcast_operator",
      "coach",
      "referee",
      "media",
      "viewer",
    ]);
  });

  it("keeps access statuses aligned with the access_status database enum", () => {
    expect(ACCESS_STATUSES).toEqual(["invited", "active", "suspended", "disabled", "archived"]);
    expect(isAccessStatus("archived")).toBe(true);
    expect(isAccessStatus("deleted")).toBe(false);
  });

  it("rejects unknown role and invitation values", () => {
    expect(isPlatformRole("owner")).toBe(false);
    expect(isInvitationStatus("deleted")).toBe(false);
  });
});
