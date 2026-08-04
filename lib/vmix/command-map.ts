import type { VMixFunctionName } from "./types";

/**
 * Reference mapping from Broadcast Center actions to the vMix Function
 * each one is designed to eventually call. This is documentation encoded
 * as data, not a working dispatcher — most Broadcast Center actions
 * (app/live/[matchId]/actions.ts) do not call sendVMixCommand() yet. See
 * VMIX_INTEGRATION.md §"What's real vs. planned" for the exact list.
 */
export const VMIX_COMMAND_MAP: Record<
  string,
  { function: VMixFunctionName; note: string; wired: boolean }
> = {
  "score.goal": {
    function: "SetText",
    note: "Push the updated home/away score onto the scoreboard GT title, then Fade it in if not already live.",
    wired: false,
  },
  "score.manualEdit": {
    function: "SetText",
    note: "Same scoreboard title update path as a goal, without a corresponding timeline event.",
    wired: false,
  },
  "event.yellowCard": {
    function: "OverlayInput1In",
    note: "Take a 'Yellow Card' lower-third graphic to overlay channel 1, player name via SetText first.",
    wired: false,
  },
  "event.redCard": {
    function: "OverlayInput1In",
    note: "Take a 'Red Card' lower-third graphic to overlay channel 1, player name via SetText first.",
    wired: false,
  },
  "event.substitution": {
    function: "OverlayInput2In",
    note: "Take a 'Substitution' lower-third to overlay channel 2 with in/out player names.",
    wired: false,
  },
  "match.statusChange": {
    function: "SetText",
    note: "Update a status/clock title input (e.g. 'FIRST HALF', 'HT') to match the new live_status.",
    wired: false,
  },
  "graphics.take": {
    function: "OverlayInput1In",
    note: "Broadcast Graphics panel's Take action — generic per-category graphic input, exact overlay channel depends on category.",
    wired: false,
  },
  "graphics.hide": {
    function: "OverlayInput1Out",
    note: "Broadcast Graphics panel's Hide action, matching whichever overlay channel Take used.",
    wired: false,
  },
  "program.cut": {
    function: "Cut",
    note: "Hard cut on Program — no UI control exists for this yet (Program/Preview panel is monitoring-only today).",
    wired: false,
  },
  "program.fade": {
    function: "Fade",
    note: "Fade transition on Program — same caveat as program.cut.",
    wired: false,
  },
};
