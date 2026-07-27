import { Database, Layers, ClipboardList, Radio, Satellite, Video, Disc, Wifi } from "lucide-react";
import SectionHeader from "./SectionHeader";
import LiveStatusBadge, { type BadgeTone } from "./LiveStatusBadge";

type SystemState = "connected" | "ready" | "not_configured" | "offline" | "future";

const STATE_TONE: Record<SystemState, BadgeTone> = {
  connected: "positive",
  ready: "positive",
  not_configured: "neutral",
  offline: "negative",
  future: "neutral",
};

const STATE_LABEL: Record<SystemState, string> = {
  connected: "Connected",
  ready: "Ready",
  not_configured: "Not Configured",
  offline: "Offline",
  future: "Future Integration",
};

// Truthful, not decorative: Database and Match Data really are live
// Supabase reads (this page only renders because they succeeded).
// Everything else genuinely isn't connected yet — per the brief, this
// panel must not claim connectivity that doesn't exist.
const SYSTEMS: { key: string; label: string; icon: typeof Database; state: SystemState }[] = [
  { key: "database", label: "Database", icon: Database, state: "connected" },
  { key: "match_data", label: "Match Data", icon: ClipboardList, state: "connected" },
  { key: "graphics", label: "Graphics", icon: Layers, state: "not_configured" },
  { key: "vmix", label: "vMix", icon: Radio, state: "future" },
  { key: "utc", label: "UTC", icon: Satellite, state: "future" },
  { key: "stream", label: "Stream", icon: Video, state: "offline" },
  { key: "recording", label: "Recording", icon: Disc, state: "not_configured" },
  { key: "internet", label: "Internet", icon: Wifi, state: "connected" },
];

export default function ProductionStatusPanel() {
  return (
    <div className="rounded-2xl border border-white/10 bg-white/[0.03] p-4">
      <SectionHeader title="Production Status" />
      <div className="grid grid-cols-2 gap-1.5 sm:grid-cols-4">
        {SYSTEMS.map((s) => (
          <div key={s.key} className="flex flex-col items-center gap-1.5 rounded-xl bg-white/[0.02] p-2.5 text-center">
            <s.icon size={14} className="text-white/40" />
            <span className="text-[10px] font-medium text-white/70">{s.label}</span>
            <LiveStatusBadge label={STATE_LABEL[s.state]} tone={STATE_TONE[s.state]} />
          </div>
        ))}
      </div>
    </div>
  );
}
