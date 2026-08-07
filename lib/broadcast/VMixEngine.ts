import "server-only";
import { getVMixStatus, sendVMixCommand } from "@/lib/vmix/client";
import type { VMixCommand } from "@/lib/vmix/types";
import type { BroadcastCommand, BroadcastCommandResult, BroadcastSystemEngine, BroadcastSystemStatus } from "./types";

/**
 * Translates a system-agnostic BroadcastCommand into a real vMix Function
 * call, following the same mapping documented in
 * lib/vmix/command-map.ts / VMIX_INTEGRATION.md. Returns null for command
 * kinds vMix has no defined translation for yet — send() below turns that
 * into an honest failure result, never a silent no-op.
 */
function translateToVMix(command: BroadcastCommand): VMixCommand | null {
  switch (command.kind) {
    case "score.update":
      return { function: "SetText", selectedName: "Score.Text", value: `${command.homeScore}-${command.awayScore}` };
    case "event.goal":
      return { function: "OverlayInput1In" };
    case "event.card":
      return { function: "OverlayInput1In" };
    case "event.substitution":
      return { function: "OverlayInput2In" };
    case "match.statusChange":
      return { function: "SetText", selectedName: "Status.Text", value: command.statusLabel };
    case "graphic.take":
      return { function: "OverlayInput1In" };
    case "graphic.hide":
      return { function: "OverlayInput1Out" };
    case "clock.update":
      return { function: "SetText", selectedName: "Clock.Text", value: command.minute };
    default:
      return null;
  }
}

/**
 * The vMix implementation of BroadcastSystemEngine — the only file in this
 * directory allowed to import lib/vmix/client.ts. BroadcastEngine and
 * AutomationPipeline talk to this object, never to lib/vmix directly, so
 * that adding a second system later (OBS, Ross, Vizrt, CasparCG) is a new
 * file implementing the same interface, not a change to how commands are
 * dispatched.
 */
export const VMixEngine: BroadcastSystemEngine = {
  id: "vmix",
  label: "vMix",

  async getStatus(): Promise<BroadcastSystemStatus> {
    const status = await getVMixStatus();
    return {
      systemId: this.id,
      label: this.label,
      state: status.state,
      detail: status.state === "connected" ? `vMix ${status.version ?? ""}`.trim() : status.error,
      checkedAt: status.checkedAt,
    };
  },

  async send(command: BroadcastCommand): Promise<BroadcastCommandResult> {
    const translated = translateToVMix(command);
    if (!translated) {
      return { ok: false, systemId: this.id, error: `VMixEngine has no translation for "${command.kind}" yet.` };
    }
    const result = await sendVMixCommand(translated);
    return result.ok ? { ok: true, systemId: this.id } : { ok: false, systemId: this.id, error: result.error };
  },
};
