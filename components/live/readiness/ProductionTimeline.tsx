import { Clock } from "lucide-react";
import type { TimelineEntry } from "@/lib/production-timeline";

export default function ProductionTimeline({ entries }: { entries: TimelineEntry[] }) {
  return (
    <div className="surface-panel p-4">
      <p className="mb-3 flex items-center gap-2 text-xs font-semibold uppercase tracking-wide text-white/40">
        <Clock size={13} /> Match Preparation Timeline
      </p>
      {entries.length === 0 ? (
        <p className="text-xs text-white/25">Nothing recorded yet.</p>
      ) : (
        <div className="relative flex flex-col gap-4 pl-4">
          <div className="absolute bottom-1 left-[3px] top-1 w-px bg-white/10" />
          {entries.map((e) => (
            <div key={e.id} className="relative flex items-baseline gap-3">
              <span className="absolute -left-4 top-1 h-1.5 w-1.5 rounded-full bg-brand-400 ring-4 ring-surface-950" />
              <span className="w-14 flex-none font-display text-xs font-bold tabular-nums text-white/40">
                {new Date(e.time).toLocaleTimeString("en", { hour: "2-digit", minute: "2-digit" })}
              </span>
              <span className="text-sm text-white/80">{e.label}</span>
              {e.detail && <span className="text-xs text-white/25">· {e.detail}</span>}
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
