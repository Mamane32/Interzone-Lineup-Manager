import "server-only";
import type { BroadcastOperator, BroadcastSystemStatus } from "../types";
import type { ProviderCapabilities } from "./types";

/**
 * BroadcastProvider — Phase 2's minimal version of
 * BROADCAST_RUNTIME_ARCHITECTURE.md section 3's interface: registration,
 * health, and capability reporting only. `dispatch`/`onProviderEvent`
 * (outbound/inbound command flow) aren't part of this type yet — outbound
 * dispatch for a registered provider's real capabilities already happens
 * through the existing BroadcastEngine/AutomationPipeline path unchanged;
 * this interface exists to answer "what can this provider do, and is it
 * reachable," not to replace that dispatch mechanism.
 */
export interface BroadcastProvider {
  readonly id: BroadcastOperator;
  readonly label: string;
  readonly capabilities: ProviderCapabilities;
  getHealth(): Promise<BroadcastSystemStatus>;
}

/**
 * GGSP as a registered provider in its own right — Standalone Mode stops
 * being an implicit default and becomes a real entry with a real,
 * declared capability set, per BROADCAST_RUNTIME_ARCHITECTURE.md section 3.
 * GGSP never receives an outbound BroadcastCommand (it IS the process
 * already acting — its own Server Actions write the database directly),
 * so `canReceiveCommands` is honestly empty.
 */
const GgspProvider: BroadcastProvider = {
  id: "ggsp",
  label: "GGSP",
  capabilities: {
    canOwn: ["website", "statistics", "match_events", "graphics", "tactical_formation", "clock"],
    canReceiveCommands: [],
  },
  async getHealth(): Promise<BroadcastSystemStatus> {
    // GGSP is the application serving this request — there is no
    // "unreachable GGSP" state the way an external system can be down.
    return { systemId: "ggsp", label: "GGSP", state: "connected", checkedAt: new Date().toISOString() };
  },
};

/**
 * vMix as a registered provider. `canOwn`/`canReceiveCommands` list only
 * "clock" and "graphics" — the two capabilities VMixEngine.ts genuinely
 * translates into a real vMix Function call today (SetText Clock.Text,
 * OverlayInput1In/Out). Recording/replay/audio/camera/streaming are
 * deliberately absent: VMixEngine has no translation for them yet, and
 * claiming them here would be exactly the kind of capability that isn't
 * real this architecture's own discipline rejects elsewhere.
 */
const VMixProvider: BroadcastProvider = {
  id: "vmix",
  label: "vMix",
  capabilities: {
    canOwn: ["clock", "graphics"],
    canReceiveCommands: ["clock", "graphics"],
  },
  async getHealth(): Promise<BroadcastSystemStatus> {
    // Dynamic import, not a top-level one: BroadcastEngine.ts pulls in
    // VMixEngine.ts -> lib/vmix/client.ts, which wraps its status check in
    // React's cache() — that throws outside an actual Server Component
    // render (e.g. under vitest), so importing it at module load time
    // would break every test that imports this registry, even ones that
    // never call getHealth(). Deferring the import until this method is
    // actually invoked keeps REGISTERED_PROVIDERS/getProvider/capabilities
    // safely importable for pure-logic tests
    // (tests/characterization/broadcast-runtime.test.ts) while real
    // callers (Server Components/Actions) still get the real check.
    const { BroadcastEngine } = await import("../BroadcastEngine");
    return BroadcastEngine.getSystemStatus("vmix");
  },
};

/**
 * "obs" is deliberately not registered — same "reserved in the schema,
 * not yet a real choice" rule migration 035 and BroadcastOperatorControl's
 * disabled "Soon" option already establish. Adding a real ObsProvider
 * later is a new entry here, nothing else in this file changes.
 */
export const REGISTERED_PROVIDERS: BroadcastProvider[] = [GgspProvider, VMixProvider];

export function getProvider(id: BroadcastOperator): BroadcastProvider | undefined {
  return REGISTERED_PROVIDERS.find((p) => p.id === id);
}
