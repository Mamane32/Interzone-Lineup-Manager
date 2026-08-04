import { beforeEach, describe, expect, it, vi } from "vitest";

const state = vi.hoisted(() => ({
  team: { id: "team-1", token: "team-token" } as Record<string, unknown> | null,
  lineup: { id: "lineup-1", locked: false } as Record<string, unknown> | null,
  players: [{ id: "player-1" }, { id: "player-2" }],
  updateError: null as { message: string } | null,
}));

vi.mock("next/cache", () => ({ revalidatePath: vi.fn() }));
vi.mock("@/lib/coach-auth", () => ({ requireCoach: async () => ({ team: state.team, email: "coach@example.com" }) }));

vi.mock("@/lib/supabase-admin", () => ({
  supabaseAdmin: () => ({
    from: (table: string) => {
      if (table === "teams") {
        return {
          select: () => ({ eq: () => ({ single: async () => ({ data: state.team }) }) }),
          update: () => ({ eq: async () => ({ error: null }) }),
        };
      }
      if (table === "lineups") {
        return {
          select: () => ({ eq: () => ({ eq: () => ({ single: async () => ({ data: state.lineup }) }) }) }),
          update: () => ({ eq: async () => ({ error: state.updateError }) }),
        };
      }
      if (table === "players") {
        return { select: () => ({ eq: async () => ({ data: state.players }) }) };
      }
      throw new Error(`unexpected table ${table}`);
    },
  }),
}));

import { submitLineup } from "@/app/team/[token]/actions";

function buildFormData() {
  const fd = new FormData();
  fd.set("match_id", "match-1");
  fd.set("coach_name", "Coach Example");
  fd.set("coach_phone", "50912345678");
  for (let i = 0; i < 11; i++) fd.set(`starter_${i}`, `player-${i + 1}`);
  return fd;
}

describe("submitLineup roster scoping", () => {
  beforeEach(() => {
    state.team = { id: "team-1", token: "team-token" };
    state.lineup = { id: "lineup-1", locked: false };
    state.players = Array.from({ length: 11 }, (_, i) => ({ id: `player-${i + 1}` }));
    state.updateError = null;
  });

  it("rejects a submitted player id that does not belong to this team's roster", async () => {
    const fd = buildFormData();
    fd.set("starter_10", "someone-elses-player");

    const result = await submitLineup("team-token", fd);
    expect(result).toEqual({ ok: false, error: "Yon jwè pa fè pati ekip sa a." });
  });

  it("accepts a lineup made entirely of this team's own roster", async () => {
    const fd = buildFormData();
    const result = await submitLineup("team-token", fd);
    expect(result).toEqual({ ok: true });
  });
});
