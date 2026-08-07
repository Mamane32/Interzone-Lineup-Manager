import "server-only";
import type { BroadcastConnectionState } from "./types";

/**
 * BroadcastBridge — the inbound counterpart to BroadcastEngine.
 *
 * BroadcastEngine (BroadcastSystemEngine, VMixEngine) is GGSP telling a
 * production system what happened — outbound, GGSP-as-operator. This file
 * is the reverse direction: a production system telling GGSP what
 * happened, for a match whose active operator (matches.broadcast_operator,
 * migration 035) is that system, not GGSP itself. When operator = "vmix",
 * a human enters a goal inside vMix directly; the goal only becomes real
 * for GGSP (a match_events row, an updated score, the public site
 * reflecting it) once something on this side receives it.
 *
 * The event vocabulary a real bridge would translate INTO is deliberately
 * NOT a new one — it's exactly the parameters
 * app/live/[matchId]/actions.ts's addGoalEvent/addMatchEvent/setLiveStatus
 * already take. A real BroadcastBridgeProvider's job is translating its
 * own system's native event (a vMix Trigger firing, an OBS WebSocket
 * message) into a call to one of those same three functions — GGSP's
 * database write path does not change; only where the call originates
 * does. No second source of truth is introduced.
 *
 * No provider is registered today — there is no real transport (webhook
 * receiver, polling loop, vMix Trigger listener, OBS WebSocket client) for
 * either vMix or OBS. This file is real, working plumbing with an honest
 * empty registry, not a stand-in for a connection that doesn't exist —
 * the same pattern lib/broadcast/WebsiteSync.ts already established for
 * "push data out to a site" and lib/vmix/client.ts established for "is
 * vMix reachable." Building the first real provider here is explicitly
 * out of scope for this pass — see BROADCAST_BRIDGE_ARCHITECTURE.md.
 */

export interface BroadcastBridgeProvider {
  readonly id: string;
  readonly label: string;
  getStatus(): Promise<{ providerId: string; label: string; state: BroadcastConnectionState; detail?: string; checkedAt: string }>;
}

const REGISTERED_BRIDGE_PROVIDERS: BroadcastBridgeProvider[] = [];

async function getProvidersStatus() {
  if (REGISTERED_BRIDGE_PROVIDERS.length === 0) {
    return [{ providerId: "none", label: "Broadcast Bridge", state: "not_configured" as BroadcastConnectionState, checkedAt: new Date().toISOString() }];
  }
  return Promise.all(REGISTERED_BRIDGE_PROVIDERS.map((provider) => provider.getStatus()));
}

export const BroadcastBridge = { getProvidersStatus, providers: REGISTERED_BRIDGE_PROVIDERS };
