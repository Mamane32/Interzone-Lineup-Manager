import { Activity, Radio } from "lucide-react";
import type { BroadcastSubsystem, BroadcastSubsystemState } from "@/lib/broadcast/BroadcastSession";

const STATE_STYLE: Record<BroadcastSubsystemState, string> = {
  active: "bg-emerald-400/10 text-emerald-300",
  not_configured: "bg-white/5 text-white/35",
  planned: "bg-white/[0.03] text-white/20",
};

const STATE_LABEL: Record<BroadcastSubsystemState, string> = {
  active: "Active",
  not_configured: "Not Configured",
  planned: "Planned",
};

/** Mission Control's subsystem status grid — everything the Broadcast Session coordinates, one glance. */
export default function MissionControlGrid({ subsystems }: { subsystems: BroadcastSubsystem[] }) {
  return (
    <div className="surface-panel p-4">
      <p className="mb-3 flex items-center gap-2 text-xs font-semibold uppercase tracking-wide text-white/40">
        <Activity size={13} /> Broadcast Session
      </p>
      <div className="grid grid-cols-2 gap-2 sm:grid-cols-3 lg:grid-cols-4">
        {subsystems.map((s) => (
          <div key={s.key} className="surface-recessed flex flex-col gap-1.5 p-3">
            <div className="flex items-center justify-between">
              <span className="text-xs font-medium text-white/70">{s.label}</span>
              {s.state === "active" && (
                <span className="relative flex h-1.5 w-1.5">
                  <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-emerald-400 opacity-75" />
                  <span className="relative inline-flex h-1.5 w-1.5 rounded-full bg-emerald-400" />
                </span>
              )}
            </div>
            <span className={`w-fit rounded-full px-2 py-0.5 text-[9px] font-bold uppercase tracking-wide ${STATE_STYLE[s.state]}`}>
              {STATE_LABEL[s.state]}
            </span>
            {s.detail && <span className="truncate text-[10px] text-white/25">{s.detail}</span>}
          </div>
        ))}
      </div>
      <p className="mt-3 flex items-center gap-1.5 text-[10px] text-white/20">
        <Radio size={10} /> One Broadcast Session per match — this coordinates status, it does not yet drive any of these systems.
      </p>
    </div>
  );
}
