import "server-only";
import { AutomationPipeline } from "./AutomationPipeline";
import type { BroadcastCommandResult } from "./types";

/**
 * Graphics domain's broadcast-dispatch boundary. components/live/BroadcastPanel.tsx's
 * Take/Hide actions are local component state only today (see its own doc
 * comment) — nothing persists a "live graphic" anywhere, so there is
 * nothing yet for a Server Action to call these from. They exist now so
 * that when Broadcast Graphics gets real server-tracked state, wiring it
 * to actually reach vMix is calling these two functions, not designing a
 * new dispatch path.
 */

export async function takeGraphic(params: { matchId: string; graphicId: string; category: string }): Promise<BroadcastCommandResult[]> {
  return AutomationPipeline.run({ kind: "graphic.take", ...params });
}

export async function hideGraphic(params: { matchId: string; graphicId: string }): Promise<BroadcastCommandResult[]> {
  return AutomationPipeline.run({ kind: "graphic.hide", ...params });
}
