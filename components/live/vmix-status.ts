import type { BroadcastConnectionState } from "@/lib/broadcast/types";
import type { SystemState } from "./ProductionStatusPanel";

/**
 * Maps any real connection result (vMix's, Website Sync's — both share the
 * same not_configured/connected/error vocabulary via BroadcastConnectionState)
 * onto the Production Status panel's display vocabulary.
 */
export function connectionStateToSystemState(state: BroadcastConnectionState): SystemState {
  if (state === "connected") return "connected";
  if (state === "error") return "offline";
  return "not_configured";
}
