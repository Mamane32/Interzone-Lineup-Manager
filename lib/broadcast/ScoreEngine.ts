import "server-only";
import { AutomationPipeline } from "./AutomationPipeline";
import type { BroadcastCommandResult } from "./types";

/**
 * Score domain's broadcast-dispatch boundary. This does NOT write to the
 * database — app/live/[matchId]/actions.ts (setManualScore, GoalDialog's
 * action) remains the single source of truth for score state, exactly as
 * it is today, and is untouched by this file. ScoreEngine is the next step
 * *after* that write already succeeded: turn it into a system-agnostic
 * command and run it through the automation pipeline.
 *
 * Not called from any Server Action yet — see VMIX_INTEGRATION.md's "next
 * milestone." Wiring the first real call site is a deliberate, separate
 * step after this architecture lands, not part of it.
 */
export async function broadcastScoreUpdate(params: {
  matchId: string;
  homeScore: number;
  awayScore: number;
}): Promise<BroadcastCommandResult[]> {
  return AutomationPipeline.run({ kind: "score.update", ...params });
}
