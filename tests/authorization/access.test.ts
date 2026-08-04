import { beforeEach, describe, expect, it, vi } from "vitest";
import type { PlatformRole } from "@/lib/types";

const state = vi.hoisted(() => ({
  user: null as { id: string } | null,
  profile: null as { id: string; status: string } | null,
  assignments: [] as Array<{
    id?: string;
    role_key: PlatformRole;
    status: string;
    team_id?: string | null;
  }>,
  team: null as { id: string; name: string; token: string; competition: null } | null,
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
      const result =
        table === "profiles"
          ? state.profile
          : table === "teams"
            ? state.team
            : state.assignments;
      const chain = {
        select: () => chain,
        eq: () => chain,
        single: async () => ({ data: result }),
        then: (resolve: (value: { data: unknown }) => unknown) =>
          Promise.resolve(resolve({ data: result })),
      };
      return chain;
    },
  }),
}));

import { requireRole, resolveUserDestination } from "@/lib/access";

describe("requireRole authorization characterization", () => {
  beforeEach(() => {
    state.user = null;
    state.profile = null;
    state.assignments = [];
    state.team = null;
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

  it("routes a super administrator to the real dashboard page", async () => {
    state.profile = { id: "user-1", status: "active" };
    state.assignments = [{ role_key: "super_admin", status: "active" }];

    await expect(resolveUserDestination("user-1")).resolves.toEqual({
      kind: "redirect",
      path: "/admin/dashboard",
    });
  });

  it("routes an administrator to the real dashboard page", async () => {
    state.profile = { id: "user-1", status: "active" };
    state.assignments = [{ role_key: "admin", status: "active" }];

    await expect(resolveUserDestination("user-1")).resolves.toEqual({
      kind: "redirect",
      path: "/admin/dashboard",
    });
  });

  it.each([
    ["competition_manager", "/competition"],
    ["broadcast_operator", "/live"],
    ["referee", "/referee"],
    ["media", "/media"],
    ["viewer", "/viewer"],
  ] as const)("routes %s to its role workspace", async (role, path) => {
    state.profile = { id: "user-1", status: "active" };
    state.assignments = [{ id: "assignment-1", role_key: role, status: "active" }];

    await expect(resolveUserDestination("user-1")).resolves.toEqual({
      kind: "redirect",
      path,
    });
  });

  it("routes a coach to the assigned team dashboard", async () => {
    state.profile = { id: "user-1", status: "active" };
    state.assignments = [
      {
        id: "assignment-1",
        role_key: "coach",
        status: "active",
        team_id: "team-1",
      },
    ];
    state.team = {
      id: "team-1",
      name: "Interzone FC",
      token: "team-token",
      competition: null,
    };

    await expect(resolveUserDestination("user-1")).resolves.toEqual({
      kind: "redirect",
      path: "/team/team-token/dashboard",
    });
  });
});
