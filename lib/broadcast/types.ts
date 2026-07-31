/**
 * lib/broadcast — the orchestration layer. See VMIX_INTEGRATION.md and the
 * doc comment on BroadcastEngine.ts for the full architecture.
 *
 * BroadcastCommand is deliberately system-agnostic: it describes *what
 * happened in the match* (a goal, a card, a status change), never *how* a
 * specific vision mixer expresses it (vMix's "SetText on the Score.Text
 * field", OBS's equivalent, Ross's equivalent). Every SystemEngine
 * (VMixEngine today; a future ObsEngine, RossEngine, VizrtEngine,
 * CasparCgEngine) is responsible for translating this shared vocabulary
 * into its own system's protocol. Nothing above SystemEngine — ScoreEngine,
 * EventEngine, GraphicsEngine, AutomationPipeline, BroadcastEngine itself —
 * knows or cares which systems are actually registered.
 */
export type BroadcastCommand =
  | { kind: "score.update"; matchId: string; homeScore: number; awayScore: number }
  | { kind: "event.goal"; matchId: string; team: "home" | "away"; playerName: string | null; minute: string }
  | {
      kind: "event.card";
      matchId: string;
      cardType: "yellow" | "second_yellow" | "red";
      team: "home" | "away";
      playerName: string | null;
      minute: string;
    }
  | {
      kind: "event.substitution";
      matchId: string;
      team: "home" | "away";
      playerOutName: string | null;
      playerInName: string | null;
      minute: string;
    }
  | { kind: "match.statusChange"; matchId: string; statusLabel: string }
  | { kind: "graphic.take"; matchId: string; graphicId: string; category: string }
  | { kind: "graphic.hide"; matchId: string; graphicId: string };

export type BroadcastCommandResult = { ok: true; systemId: string } | { ok: false; systemId: string; error: string };

export type BroadcastConnectionState = "not_configured" | "connected" | "error";

export interface BroadcastSystemStatus {
  systemId: string;
  label: string;
  state: BroadcastConnectionState;
  detail?: string;
  checkedAt: string;
}

/**
 * The contract every production-system integration implements. vMix today;
 * the shape is written so OBS/Ross/Vizrt/CasparCG can be added later as
 * their own file, each implementing this same interface, registered in
 * BroadcastEngine.ts — no change needed anywhere else.
 */
export interface BroadcastSystemEngine {
  readonly id: string;
  readonly label: string;
  getStatus(): Promise<BroadcastSystemStatus>;
  send(command: BroadcastCommand): Promise<BroadcastCommandResult>;
}
