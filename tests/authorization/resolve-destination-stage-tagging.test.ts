import { beforeEach, describe, expect, it, vi } from "vitest";

const state = vi.hoisted(() => ({
  profile: { id: "user-1", status: "active" } as Record<string, unknown> | null,
  assignments: [] as Array<Record<string, unknown>>,
  team: null as Record<string, unknown> | null,
  throwOnCallNumber: null as number | null,
  callCount: 0,
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
  createClient: () => ({ auth: { getUser: async () => ({ data: { user: null } }) } }),
}));

vi.mock("@/lib/supabase-admin", () => ({
  supabaseAdmin: () => {
    state.callCount += 1;
    if (state.throwOnCallNumber === state.callCount) {
      throw new Error(`boom on call ${state.callCount}`);
    }
    return {
      from: (table: string) => {
        const result = table === "profiles" ? state.profile : table === "teams" ? state.team : state.assignments;
        const chain = {
          select: () => chain,
          eq: () => chain,
          single: async () => ({ data: result }),
          then: (resolve: (value: { data: unknown }) => unknown) => Promise.resolve(resolve({ data: result })),
        };
        return chain;
      },
    };
  },
}));

import { resolveUserDestination } from "@/lib/access";

describe("resolveUserDestination stage tagging", () => {
  beforeEach(() => {
    state.profile = { id: "user-1", status: "active" };
    state.assignments = [];
    state.team = null;
    state.throwOnCallNumber = null;
    state.callCount = 0;
  });

  it("tags getProfile when the first supabaseAdmin() call throws", async () => {
    state.throwOnCallNumber = 1;
    await expect(resolveUserDestination("user-1")).rejects.toThrow(
      "[resolveUserDestination:getProfile] boom on call 1"
    );
  });

  it("tags getActiveAssignments when the second supabaseAdmin() call throws", async () => {
    state.throwOnCallNumber = 2;
    await expect(resolveUserDestination("user-1")).rejects.toThrow(
      "[resolveUserDestination:getActiveAssignments] boom on call 2"
    );
  });

  it("tags optionForAssignment when a per-assignment lookup throws", async () => {
    state.assignments = [{ id: "a1", role_key: "coach", status: "active", team_id: "team-1" }];
    state.throwOnCallNumber = 3;
    await expect(resolveUserDestination("user-1")).rejects.toThrow(
      "[resolveUserDestination:optionForAssignment] boom on call 3"
    );
  });

  it("resolves normally when nothing throws (no regression)", async () => {
    state.assignments = [{ id: "a1", role_key: "admin", status: "active" }];
    await expect(resolveUserDestination("user-1")).resolves.toEqual({
      kind: "redirect",
      path: "/admin/dashboard",
    });
  });
});
