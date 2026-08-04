import "server-only";
import { enqueueAndTakeProductionItem } from "./ProductionQueueEngine";
import type { MatchEventType } from "@/lib/types";

/**
 * Sprint 3's "Graphics Integration": every timeline event that has an
 * obvious matching graphic in Broadcast Panel's catalog (components/live/
 * BroadcastPanel.tsx's CATEGORIES) can trigger it automatically the
 * moment the event is logged — one less click for the operator, and the
 * graphic name/key here is the exact same string that catalog already
 * uses, so an auto-triggered "Goal" is indistinguishable in the queue
 * from one the operator clicked by hand.
 *
 * Deliberately a lookup table, not a branch per event type inline in the
 * Server Action that logs events — adding or changing which events
 * auto-trigger a graphic is a one-line edit here, not a hunt through
 * app/live/[matchId]/actions.ts.
 *
 * Not every event type has an entry — match-phase markers (match_start,
 * half_time, match_resume, match_end) already get their own broadcast
 * notification through setLiveStatus/broadcastStatusChange; triggering a
 * graphic here too would announce the same phase change twice.
 */
const AUTO_GRAPHIC_MAP: Partial<Record<MatchEventType, string>> = {
  goal: "Goal",
  penalty_goal: "Goal",
  own_goal: "Goal",
  yellow_card: "Yellow Card",
  second_yellow: "Red Card",
  red_card: "Red Card",
  substitution: "Substitution",
  var: "VAR Review",
  penalty_missed: "Penalty",
  injury: "Injury",
  additional_time: "Additional Time",
};

/**
 * Called after a match event's database write has already succeeded
 * (same "never allowed to fail the Server Action" rule as every other
 * broadcast-layer side effect in app/live/[matchId]/actions.ts) — enqueues
 * and takes the matching graphic through the Production Queue Engine,
 * the single dispatch layer for graphics. A no-op for event types with no
 * matching catalog entry.
 */
export async function autoTriggerGraphicForEvent(matchId: string, eventType: MatchEventType): Promise<void> {
  const graphicKey = AUTO_GRAPHIC_MAP[eventType];
  if (!graphicKey) return;
  await enqueueAndTakeProductionItem(matchId, "graphics", "in", graphicKey, graphicKey);
}
