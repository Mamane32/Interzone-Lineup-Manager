import "server-only";
import { AutomationPipeline } from "./AutomationPipeline";
import type { BroadcastCommandResult } from "./types";

/**
 * Graphics domain's broadcast-dispatch boundary. Called from exactly one
 * place: lib/broadcast/ProductionQueueEngine.ts's registered "graphics"
 * consumer handler, itself invoked by takeProductionItem()/
 * hideProductionItem() — never directly from a Server Action. That's
 * deliberate: the Production Queue is the single dispatch layer for
 * graphics (Sprint 3), so every graphic take/hide, whether an operator's
 * click in BroadcastPanel or an automatic trigger from a timeline event
 * (lib/broadcast/graphics-automation.ts), goes through the queue's
 * persisted state first. A Server Action calling these two functions
 * directly again would silently bypass that persistence, exactly the bug
 * this file's three former direct call sites in
 * app/live/[matchId]/actions.ts had until Sprint 3 fixed them.
 */

export async function takeGraphic(params: { matchId: string; graphicId: string; category: string }): Promise<BroadcastCommandResult[]> {
  return AutomationPipeline.run({ kind: "graphic.take", ...params });
}

export async function hideGraphic(params: { matchId: string; graphicId: string }): Promise<BroadcastCommandResult[]> {
  return AutomationPipeline.run({ kind: "graphic.hide", ...params });
}
