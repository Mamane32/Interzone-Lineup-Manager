import "server-only";
import { AutomationPipeline } from "./AutomationPipeline";
import type { BroadcastCommandResult } from "./types";

/**
 * Match-event domain's broadcast-dispatch boundary — the same pattern as
 * ScoreEngine.ts. app/live/[matchId]/actions.ts (GoalDialog, EventDialog,
 * the timeline's edit/delete actions) remains the source of truth for
 * event data; these functions are what a Server Action calls *after* an
 * event write succeeds, to notify every connected broadcast system.
 * Not called from any Server Action yet.
 */

export async function broadcastGoal(params: {
  matchId: string;
  team: "home" | "away";
  playerName: string | null;
  minute: string;
}): Promise<BroadcastCommandResult[]> {
  return AutomationPipeline.run({ kind: "event.goal", ...params });
}

export async function broadcastCard(params: {
  matchId: string;
  cardType: "yellow" | "second_yellow" | "red";
  team: "home" | "away";
  playerName: string | null;
  minute: string;
}): Promise<BroadcastCommandResult[]> {
  return AutomationPipeline.run({ kind: "event.card", ...params });
}

export async function broadcastSubstitution(params: {
  matchId: string;
  team: "home" | "away";
  playerOutName: string | null;
  playerInName: string | null;
  minute: string;
}): Promise<BroadcastCommandResult[]> {
  return AutomationPipeline.run({ kind: "event.substitution", ...params });
}

export async function broadcastStatusChange(params: { matchId: string; statusLabel: string }): Promise<BroadcastCommandResult[]> {
  return AutomationPipeline.run({ kind: "match.statusChange", ...params });
}
