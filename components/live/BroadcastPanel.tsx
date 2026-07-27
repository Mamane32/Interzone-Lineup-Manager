import { Radio, Globe, Layers, RotateCcw, Film, Database } from "lucide-react";

type IntegrationStatus = "connected" | "disconnected" | "pending";

// Every integration listed in the brief, with its status. None are wired
// up ("No implementation required yet") — this panel exists so the layout
// and status vocabulary are already in place when a real connection is
// added in a future sprint. All statuses are currently "disconnected".
const INTEGRATIONS: { key: string; label: string; icon: typeof Radio; status: IntegrationStatus }[] = [
  { key: "vmix", label: "vMix", icon: Radio, status: "disconnected" },
  { key: "website", label: "Website", icon: Globe, status: "disconnected" },
  { key: "graphics", label: "Graphics", icon: Layers, status: "disconnected" },
  { key: "replay", label: "Replay", icon: RotateCcw, status: "disconnected" },
  { key: "highlights", label: "Highlights", icon: Film, status: "disconnected" },
  { key: "utc", label: "UTC", icon: Database, status: "disconnected" },
];

const STATUS_STYLE: Record<IntegrationStatus, string> = {
  connected: "bg-emerald-500/15 text-emerald-400",
  disconnected: "bg-white/5 text-white/30",
  pending: "bg-amber-signal/15 text-amber-signal",
};

const STATUS_LABEL: Record<IntegrationStatus, string> = {
  connected: "Connected",
  disconnected: "Disconnected",
  pending: "Pending",
};

export default function BroadcastPanel() {
  return (
    <div className="rounded-2xl border border-white/10 bg-white/[0.03] p-4">
      <div className="mb-3 flex items-center justify-between">
        <h2 className="text-xs font-semibold uppercase tracking-wide text-white/40">Broadcast</h2>
        <span className="rounded-full bg-white/5 px-2 py-0.5 text-[10px] text-white/30">No integrations wired yet</span>
      </div>
      <div className="grid grid-cols-2 gap-2 sm:grid-cols-3">
        {INTEGRATIONS.map((i) => (
          <div key={i.key} className="flex flex-col items-center gap-1.5 rounded-xl bg-white/[0.03] p-3 text-center">
            <i.icon size={16} className="text-white/40" />
            <span className="text-[11px] font-medium text-white/70">{i.label}</span>
            <span className={`rounded-full px-2 py-0.5 text-[9px] font-bold uppercase tracking-wide ${STATUS_STYLE[i.status]}`}>
              {STATUS_LABEL[i.status]}
            </span>
          </div>
        ))}
      </div>
    </div>
  );
}
