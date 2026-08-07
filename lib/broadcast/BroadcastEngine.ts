import "server-only";
import { VMixEngine } from "./VMixEngine";
import type { BroadcastCommand, BroadcastCommandResult, BroadcastSystemEngine, BroadcastSystemStatus } from "./types";

/**
 * BroadcastEngine — the single place that knows which production systems
 * are connected to GGSP. Today that's vMix only. Adding OBS, Ross, Vizrt,
 * or CasparCG later means writing a new file (e.g. ObsEngine.ts)
 * implementing BroadcastSystemEngine and adding it to this array — nothing
 * in ScoreEngine, EventEngine, GraphicsEngine, or AutomationPipeline needs
 * to change, since they only ever call BroadcastEngine.dispatch(), never a
 * specific system directly.
 */
const REGISTERED_SYSTEMS: BroadcastSystemEngine[] = [VMixEngine];

/** Sends one command to every registered system in parallel, and reports each result — never throws on a single system's failure. */
async function dispatch(command: BroadcastCommand): Promise<BroadcastCommandResult[]> {
  return Promise.all(REGISTERED_SYSTEMS.map((system) => system.send(command)));
}

/** Status of every registered system — what the Broadcast Center's Production Status panel and Mission Control strip read. */
async function getSystemsStatus(): Promise<BroadcastSystemStatus[]> {
  return Promise.all(REGISTERED_SYSTEMS.map((system) => system.getStatus()));
}

/**
 * One system's status by id — for a caller that only cares about "is vMix
 * up," not the whole registry. Never throws and never returns undefined:
 * a system id nothing has registered (a typo, or a system removed from
 * REGISTERED_SYSTEMS) reports the same honest "not_configured" a real,
 * unconfigured provider would — the caller doesn't need a separate
 * not-found branch. This is the one path UI code should use to ask about
 * vMix specifically, instead of importing lib/vmix/client directly: the
 * whole point of REGISTERED_SYSTEMS is that callers above this file never
 * need to know which concrete systems exist.
 */
async function getSystemStatus(systemId: string): Promise<BroadcastSystemStatus> {
  const statuses = await getSystemsStatus();
  return (
    statuses.find((s) => s.systemId === systemId) ?? {
      systemId,
      label: systemId,
      state: "not_configured",
      checkedAt: new Date().toISOString(),
    }
  );
}

export const BroadcastEngine = {
  dispatch,
  getSystemsStatus,
  getSystemStatus,
  systems: REGISTERED_SYSTEMS,
};
