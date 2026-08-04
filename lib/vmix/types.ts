/**
 * vMix Integration — types. See VMIX_INTEGRATION.md for the full
 * architecture writeup: what's real today, what's designed but not wired
 * to a UI action yet, and why.
 */

export type VMixConnectionState = "not_configured" | "connected" | "error";

export interface VMixConfig {
  host: string;
  port: number;
}

export interface VMixStatusResult {
  state: VMixConnectionState;
  /** vMix version string, only present when state === "connected". */
  version?: string;
  edition?: string;
  error?: string;
  checkedAt: string;
}

/**
 * The subset of vMix's real HTTP Function API (`GET /api/?Function=...`)
 * this integration is designed against. Every name here is a real vMix
 * Function — see https://www.vmix.com/help27/index.htm?DeveloperAPI.html.
 * Not every one has a caller wired up yet (see command-map.ts).
 */
export type VMixFunctionName =
  | "Cut"
  | "Fade"
  | "OverlayInput1In"
  | "OverlayInput1Out"
  | "OverlayInput2In"
  | "OverlayInput2Out"
  | "OverlayInput3In"
  | "OverlayInput3Out"
  | "SetText"
  | "SetColour"
  | "StartRecording"
  | "StopRecording"
  | "StartStreaming"
  | "StopStreaming";

export interface VMixCommand {
  function: VMixFunctionName;
  /** Input number or name the function targets (e.g. the scoreboard GT input). */
  input?: string | number;
  value?: string;
  /** For SetText/SetColour — the specific field within a GT title (e.g. "HomeScore.Text"). */
  selectedName?: string;
}

export type VMixCommandResult = { ok: true } | { ok: false; error: string };
