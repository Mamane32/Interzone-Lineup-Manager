import { beforeEach, describe, expect, it, vi } from "vitest";
import type { PlatformRole } from "@/lib/types";

const state = vi.hoisted(() => ({
  user: null as { id: string } | null,
  profile: null as { id: string; status: string } | null,
  assignments: [] as Array<{ role_key: PlatformRole; status: string }>,
}));

vi.mock("react", () => ({
  cache: <T extends (...args: never[]) => unknown>(fn: T) => fn,
}));

vi.mock("next/navigation", () => ({
  redirect: (path: string) => {
    throw new Error(`REDIRECT:${path}`);
  },
}));

vi.mock("@/lib/supabase/server", () => ({
  createClient: () => ({
    auth: {
      getUser: async () => ({ data: { user: state.user } }),
    },
  }),
}));

vi.mock("@/lib/supabase-admin", () => ({
  supabaseAdmin: () => ({
    from: (table: string) => {
      const result = table === "profiles" ? state.profile : state.assignments;
      const chain = {
        select: () => chain,
        eq: () => chain,
        single: async () => ({ data: result }),
        then: (
          resolve: (value: { data: typeof state.profile | typeof state.assignments }) => unknown
        ) => Promise.resolve(resolve({ data: result })),
      };
      return chain;
    },
  }),
}));

import { requireRole } from "@/lib/access";

describe("requireRole authorization characterization", () => {
  beforeEach(() => {
    state.user = null;
    state.profile = null;
    state.assignments = [];
  });

  it("redirects unauthenticated requests to unified login", async () => {
    await expect(requireRole(["admin"])).rejects.toThrow("REDIRECT:/login");
  });

  it("rejects an inactive profile even when the session exists", async () => {
    state.user = { id: "user-1" };
    state.profile = { id: "user-1", status: "suspended" };

    await expect(requireRole(["admin"])).rejects.toThrow("REDIRECT:/login?error=no-access");
  });

  it("returns the first active matching assignment", async () => {
    state.user = { id: "user-1" };
    state.profile = { id: "user-1", status: "active" };
    state.assignments = [
      { role_key: "viewer", status: "active" },
      { role_key: "admin", status: "active" },
    ];

    await expect(requireRole(["admin", "super_admin"])).resolves.toEqual({
      userId: "user-1",
      role: "admin",
    });
  });

  it("denies an authenticated user without an allowed role", async () => {
    state.user = { id: "user-1" };
    state.profile = { id: "user-1", status: "active" };
    state.assignments = [{ role_key: "viewer", status: "active" }];

    await expect(requireRole(["admin"])).rejects.toThrow("REDIRECT:/login?error=no-access");
  });
});
