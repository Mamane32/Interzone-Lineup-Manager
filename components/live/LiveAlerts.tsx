"use client";

import { useRef, useState } from "react";
import { AlertTriangle, Bell, X } from "lucide-react";
import { useDismissableLayer } from "@/lib/hooks";
import type { LiveAlert } from "@/lib/live-alerts";

export type { LiveAlert };

export default function LiveAlerts({ alerts }: { alerts: LiveAlert[] }) {
  const [open, setOpen] = useState(false);
  const ref = useRef<HTMLDivElement>(null);
  const critical = alerts.filter((a) => a.severity === "critical").length;

  useDismissableLayer(ref, () => setOpen(false), open);

  if (alerts.length === 0) {
    return (
      <span className="hidden items-center gap-1.5 rounded-full bg-emerald-500/10 px-2.5 py-1 text-[10px] font-bold uppercase tracking-wide text-emerald-400 sm:flex">
        <Bell size={11} /> No alerts
      </span>
    );
  }

  return (
    <div className="relative" ref={ref}>
      <button
        type="button"
        onClick={() => setOpen((v) => !v)}
        aria-expanded={open}
        className={`flex items-center gap-1.5 rounded-full px-2.5 py-1 text-[10px] font-bold uppercase tracking-wide transition ${
          critical > 0 ? "bg-red-500/15 text-red-400" : "bg-amber-signal/15 text-amber-signal"
        }`}
      >
        <AlertTriangle size={11} className={critical > 0 ? "animate-pulse" : ""} />
        {alerts.length} alert{alerts.length > 1 ? "s" : ""}
      </button>
      <div
        role="menu"
        aria-hidden={!open}
        className={`surface-panel absolute right-0 top-9 z-50 w-72 origin-top-right overflow-hidden p-0 transition-all duration-150 ease-out ${
          open ? "pointer-events-auto scale-100 opacity-100" : "pointer-events-none scale-95 opacity-0"
        }`}
      >
        <div className="flex items-center justify-between border-b border-white/10 px-3.5 py-2.5">
          <p className="text-xs font-semibold text-white">Live alerts</p>
          <button onClick={() => setOpen(false)} className="text-white/40 hover:text-white" aria-label="Close">
            <X size={14} />
          </button>
        </div>
        <ul className="divide-y divide-white/[0.06]">
          {alerts.map((a) => (
            <li key={a.id} className="flex items-center gap-2.5 px-3.5 py-2.5 text-xs">
              <span className={`h-1.5 w-1.5 flex-none rounded-full ${a.severity === "critical" ? "bg-red-500" : "bg-amber-signal"}`} />
              <span className="text-white/70">{a.label}</span>
            </li>
          ))}
        </ul>
      </div>
    </div>
  );
}
