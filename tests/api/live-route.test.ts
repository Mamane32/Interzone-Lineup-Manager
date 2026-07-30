import { beforeEach, describe, expect, it, vi } from "vitest";

const state = vi.hoisted(() => ({
  user: null as { id: string } | null,
  profile: null as { status: string } | null,
  assignment: null as { id: string } | null,
  match: null as Record<string, unknown> | null,
  events: [] as Array<Record<string, unknown>>,
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
      const dataForTable = () => {
        if (table === "profiles") return state.profile;
        if (table === "user_access_assignments") return state.assignment;
        if (table === "matches") return state.match;
        if (table === "match_events") return state.events;
        return null;
      };
      const chain = {
        select: () => chain,
        eq: () => chain,
        in: () => chain,
        limit: () => chain,
        order: () => chain,
        maybeSingle: async () => ({ data: dataForTable() }),
        single: async () => ({ data: dataForTable() }),
        then: (resolve: (value: { data: unknown }) => unknown) =>
          Promise.resolve(resolve({ data: dataForTable() })),
      };
      return chain;
    },
  }),
}));

import { GET } from "@/app/api/live/[matchId]/route";

describe("live match API authorization", () => {
  beforeEach(() => {
    state.user = null;
    state.profile = null;
    state.assignment = null;
    state.match = null;
    state.events = [];
  });

  it("returns 401 without a session", async () => {
    const response = await GET(new Request("http://localhost/api/live/match-1"), {
      params: { matchId: "match-1" },
    });
    expect(response.status).toBe(401);
  });

  it("returns 403 without an active permitted assignment", async () => {
    state.user = { id: "user-1" };
    state.profile = { status: "active" };

    const response = await GET(new Request("http://localhost/api/live/match-1"), {
      params: { matchId: "match-1" },
    });
    expect(response.status).toBe(403);
  });

  it("returns match data for an authorized session", async () => {
    state.user = { id: "user-1" };
    state.profile = { status: "active" };
    state.assignment = { id: "assignment-1" };
    state.match = { id: "match-1", live_status: "pre_match" };
    state.events = [{ minute: "12", type: "goal" }];

    const response = await GET(new Request("http://localhost/api/live/match-1"), {
      params: { matchId: "match-1" },
    });
    expect(response.status).toBe(200);
    await expect(response.json()).resolves.toEqual({
      match: state.match,
      events: state.events,
    });
  });
});
