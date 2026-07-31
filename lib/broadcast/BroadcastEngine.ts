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

export const BroadcastEngine = {
  dispatch,
  getSystemsStatus,
  systems: REGISTERED_SYSTEMS,
};
