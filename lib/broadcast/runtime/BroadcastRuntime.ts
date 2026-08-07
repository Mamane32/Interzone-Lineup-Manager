import "server-only";
import { supabaseAdmin } from "@/lib/supabase-admin";
import type { BroadcastOperator } from "../types";
import { REGISTERED_PROVIDERS, getProvider, type BroadcastProvider } from "./providers";
import { resolveOwner } from "./ownership";

/**
 * The Production Runtime façade — Phase 2's vertical slice only:
 *
 *   Select Provider -> Connect -> Report Health -> Expose Capabilities
 *   -> Become the active owner for Clock and Graphics
 *
 * BROADCAST_RUNTIME_ARCHITECTURE.md section 8 describes a larger interface
 * (Session lifecycle, dispatch, the Event Bus, Diagnostics, Outputs) —
 * none of that is implemented here. This is deliberately the smallest
 * complete slice: given a match, which provider is active, is it
 * reachable, and who owns "clock"/"graphics" right now. Later phases grow
 * this object; they don't need to replace it.
 */

/** The match's active operator, resolved to its registered BroadcastProvider — falls back to GgspProvider if the stored operator id isn't (or isn't yet) registered, the same honest default resolveOwner uses. */
async function getActiveProvider(matchId: string): Promise<BroadcastProvider> {
  const supabase = supabaseAdmin();
  const { data } = await supabase.from("matches").select("broadcast_operator").eq("id", matchId).maybeSingle();
  const operatorId = (data?.broadcast_operator as BroadcastOperator | null) ?? "ggsp";
  return getProvider(operatorId) ?? getProvider("ggsp")!;
}

export const BroadcastRuntime = {
  providers: REGISTERED_PROVIDERS,
  getActiveProvider,
  getOwner: resolveOwner,
};
