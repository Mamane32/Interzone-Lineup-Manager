import "server-only";
import { AutomationPipeline } from "./AutomationPipeline";
import type { BroadcastCommandResult } from "./types";

/**
 * Clock domain's broadcast-dispatch boundary — the same pattern as
 * ScoreEngine.ts. Does NOT introduce a new clock data model: GGSP's own
 * derived clock (lib/match-clock.ts's deriveMatchClock, computed from
 * live_status + the latest event's minute) is unchanged. This is the
 * outbound side — called from the same match_events write path
 * (addGoalEvent, addMatchEvent) using the exact minute value already being
 * recorded, so whichever provider currently owns "clock" for this match
 * (lib/broadcast/runtime/ownership.ts) receives the same value an operator
 * sees in GGSP's own UI.
 */
export async function broadcastClockUpdate(params: { matchId: string; minute: string }): Promise<BroadcastCommandResult[]> {
  return AutomationPipeline.run({ kind: "clock.update", ...params });
}
