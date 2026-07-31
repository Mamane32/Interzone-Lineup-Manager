import "server-only";
import { getVMixStatus } from "@/lib/vmix/client";
import { WebsiteSync } from "./WebsiteSync";

/**
 * BroadcastSession — the single conceptual object representing "everything
 * involved in producing this match." Each match owns exactly one, addressed
 * by matchId. There is no `broadcast_sessions` table: this is a composed
 * read model over the subsystems that already exist (Tactical Formation,
 * vMix, Website Sync) plus typed placeholders for the ones that don't yet
 * (Graphics, Animation, Statistics, Replay, Commentary, Audio, Cameras,
 * Streaming) — building on the approved architecture, not redesigning it,
 * and not inventing a second source of truth for data matches/lineups/
 * tactical_formations already own.
 *
 * When a subsystem below becomes real (e.g. Graphics gets persisted
 * state), its row's `status` here starts reading real data the same way
 * `vmix` and `website_sync` already do — the shape doesn't change.
 */

export type BroadcastSubsystemKey =
  | "tactical_formation"
  | "match_events"
  | "vmix"
  | "website_sync"
  | "graphics"
  | "animation"
  | "statistics"
  | "replay"
  | "commentary"
  | "audio"
  | "cameras"
  | "streaming";

export type BroadcastSubsystemState = "active" | "not_configured" | "planned";

export type BroadcastSubsystem = {
  key: BroadcastSubsystemKey;
  label: string;
  state: BroadcastSubsystemState;
  detail?: string;
};

export type BroadcastSession = {
  matchId: string;
  subsystems: BroadcastSubsystem[];
};

/** Builds the BroadcastSession for one match — real status for the subsystems that exist, honest "planned" for the ones that don't. */
export async function getBroadcastSession(matchId: string): Promise<BroadcastSession> {
  const [vmixStatus, websiteSyncStatuses] = await Promise.all([getVMixStatus(), WebsiteSync.getProvidersStatus()]);

  const subsystems: BroadcastSubsystem[] = [
    { key: "tactical_formation", label: "Tactical Formation", state: "active", detail: "Formation editor, presets, animation preview" },
    { key: "match_events", label: "Match Events", state: "active", detail: "Goals, cards, substitutions, status changes" },
    {
      key: "vmix",
      label: "vMix",
      state: vmixStatus.state === "connected" ? "active" : "not_configured",
      detail: vmixStatus.state === "connected" ? `vMix ${vmixStatus.version ?? ""}`.trim() : "VMIX_HOST not set",
    },
    {
      key: "website_sync",
      label: "Website Sync",
      state: websiteSyncStatuses[0]?.state === "connected" ? "active" : "not_configured",
      detail: "No provider registered",
    },
    { key: "graphics", label: "Graphics", state: "planned", detail: "Broadcast Graphics panel is UI-only today, no persisted state" },
    { key: "animation", label: "Animation", state: "planned", detail: "Preview only, not exported anywhere yet" },
    { key: "statistics", label: "Statistics", state: "planned", detail: "Statistics panel is placeholder data" },
    { key: "replay", label: "Replay", state: "planned" },
    { key: "commentary", label: "Commentary", state: "planned" },
    { key: "audio", label: "Audio", state: "planned" },
    { key: "cameras", label: "Cameras", state: "planned" },
    { key: "streaming", label: "Streaming", state: "planned" },
  ];

  return { matchId, subsystems };
}
