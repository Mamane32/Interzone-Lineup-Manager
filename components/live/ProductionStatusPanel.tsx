import { Database, Layers, ClipboardList, Radio, Satellite, Video, Disc, Wifi, Globe, type LucideIcon } from "lucide-react";
import SectionHeader from "./SectionHeader";
import LiveStatusBadge, { type BadgeTone } from "./LiveStatusBadge";

export type SystemState = "connected" | "ready" | "not_configured" | "offline" | "future";

export const STATE_TONE: Record<SystemState, BadgeTone> = {
  connected: "positive",
  ready: "positive",
  not_configured: "neutral",
  offline: "negative",
  future: "neutral",
};

export const STATE_LABEL: Record<SystemState, string> = {
  connected: "Connected",
  ready: "Ready",
  not_configured: "Not Configured",
  offline: "Offline",
  future: "Future Integration",
};

// Truthful, not decorative: Database and Match Data really are live
// Supabase reads (this page only renders because they succeeded).
// Everything else genuinely isn't connected yet — per the brief, this
// panel must not claim connectivity that doesn't exist. Exported so the
// Mission Control strip and Live Alerts can read the same source of truth
// instead of maintaining a second copy. vMix's default state here is a
// fallback only — the real state comes from lib/vmix/client.ts's
// getVMixStatus() and is threaded in via the `vmixState` prop; this
// default only shows if a caller doesn't check.
export const SYSTEMS: { key: string; label: string; icon: LucideIcon; state: SystemState }[] = [
  { key: "database", label: "Database", icon: Database, state: "connected" },
  { key: "match_data", label: "Match Data", icon: ClipboardList, state: "connected" },
  { key: "graphics", label: "Graphics", icon: Layers, state: "not_configured" },
  { key: "vmix", label: "vMix", icon: Radio, state: "not_configured" },
  { key: "utc", label: "UTC", icon: Satellite, state: "future" },
  { key: "stream", label: "Stream", icon: Video, state: "offline" },
  { key: "recording", label: "Recording", icon: Disc, state: "not_configured" },
  { key: "internet", label: "Internet", icon: Wifi, state: "connected" },
  { key: "website_sync", label: "Website Sync", icon: Globe, state: "not_configured" },
];

/** SYSTEMS with the vMix row's state replaced by a real, just-checked value. */
export function systemsWithVMixState(vmixState: SystemState) {
  return SYSTEMS.map((s) => (s.key === "vmix" ? { ...s, state: vmixState } : s));
}

/** SYSTEMS with any subset of rows replaced by real, just-checked values — keyed by SYSTEMS' own `key`. */
export function systemsWithStates(overrides: Partial<Record<string, SystemState>>) {
  return SYSTEMS.map((s) => (overrides[s.key] ? { ...s, state: overrides[s.key]! } : s));
}

export default function ProductionStatusPanel({ vmixState, websiteSyncState }: { vmixState?: SystemState; websiteSyncState?: SystemState }) {
  const systems = systemsWithStates({ vmix: vmixState, website_sync: websiteSyncState });
  return (
    <div className="surface-panel p-4">
      <SectionHeader title="Production Status" />
      <div className="grid grid-cols-2 gap-2 sm:grid-cols-4">
        {systems.map((s) => (
          <div key={s.key} className="surface-recessed flex flex-col items-center gap-1.5 p-3 text-center">
            <s.icon size={15} className="text-white/40" />
            <span className="text-[10px] font-medium text-white/70">{s.label}</span>
            <LiveStatusBadge label={STATE_LABEL[s.state]} tone={STATE_TONE[s.state]} pulse={s.state === "connected"} />
          </div>
        ))}
      </div>
    </div>
  );
}
