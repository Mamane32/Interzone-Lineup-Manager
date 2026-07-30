import { describe, expect, it } from "vitest";
import { addAuthError, getSafeAuthDestination } from "@/lib/auth-redirect";

const ORIGIN = "http://localhost:3000";

describe("authentication callback redirects", () => {
  it("accepts a local reset destination and preserves its team token", () => {
    expect(getSafeAuthDestination("/team/reset-password?token=team-123", ORIGIN)).toBe(
      "/team/reset-password?token=team-123"
    );
  });

  it.each([
    "https://attacker.example/reset",
    "//attacker.example/reset",
    "/auth/callback",
    "/auth/callback?next=/auth/callback",
  ])("rejects unsafe or looping next destination %s", (destination) => {
    expect(getSafeAuthDestination(destination, ORIGIN)).toBe("/team/reset-password");
  });

  it("uses the reset page when next is missing or malformed", () => {
    expect(getSafeAuthDestination(null, ORIGIN)).toBe("/team/reset-password");
    expect(getSafeAuthDestination("/%zz", ORIGIN)).toBe("/team/reset-password");
  });

  it("adds a recovery error without dropping existing parameters", () => {
    expect(addAuthError("/team/reset-password?token=team-123", "expired")).toBe(
      "/team/reset-password?token=team-123&error=expired"
    );
  });
});
