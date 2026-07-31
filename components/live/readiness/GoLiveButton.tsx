"use client";

import { useRef, useState } from "react";
import Link from "next/link";
import { AlertTriangle, ArrowRight, Radio, X } from "lucide-react";
import { useDismissableLayer } from "@/lib/hooks";
import type { ReadinessCheck } from "@/lib/readiness";

/**
 * The GO LIVE workflow gate. Disabled until every `critical` readiness
 * check passes — this is a gate, not a trigger: per the brief, no
 * broadcast action executes here yet, clicking the enabled button opens an
 * honest confirmation of what would happen next rather than pretending to
 * start a broadcast.
 */
export default function GoLiveButton({
  matchId,
  canGoLive,
  blockingChecks,
}: {
  matchId: string;
  canGoLive: boolean;
  blockingChecks: ReadinessCheck[];
}) {
  const [open, setOpen] = useState(false);
  const ref = useRef<HTMLDivElement>(null);
  useDismissableLayer(ref, () => setOpen(false), open);

  if (!canGoLive) {
    return (
      <div className="surface-panel flex flex-col gap-3 p-5">
        <div className="flex items-center gap-3">
          <span className="flex h-11 w-11 flex-none items-center justify-center rounded-xl bg-white/5 text-white/25">
            <Radio size={20} />
          </span>
          <div>
            <p className="font-display text-lg font-semibold text-white/40">GO LIVE</p>
            <p className="text-xs text-white/30">{blockingChecks.length} blocking requirement{blockingChecks.length === 1 ? "" : "s"} remaining</p>
          </div>
        </div>
        <div className="flex flex-col gap-1.5">
          {blockingChecks.map((c) => (
            <Link
              key={c.id}
              href={c.actionHref ? c.actionHref(matchId) : `/live/${matchId}`}
              className="flex items-center justify-between gap-2 rounded-lg bg-red-500/[0.06] px-3 py-2 text-xs text-red-300 transition hover:bg-red-500/10"
            >
              <span className="flex items-center gap-2"><AlertTriangle size={12} /> {c.warningLabel ?? c.label}</span>
              {c.actionLabel && <span className="flex items-center gap-1 font-semibold">{c.actionLabel} <ArrowRight size={10} /></span>}
            </Link>
          ))}
        </div>
      </div>
    );
  }

  return (
    <div className="surface-panel relative flex items-center gap-4 p-5 ring-1 ring-emerald-400/25" ref={ref}>
      <span className="relative flex h-11 w-11 flex-none items-center justify-center rounded-xl bg-emerald-400/15 text-emerald-300">
        <span className="absolute inline-flex h-full w-full animate-ping rounded-xl bg-emerald-400/20" />
        <Radio size={20} className="relative" />
      </span>
      <div className="flex-1">
        <p className="font-display text-lg font-semibold text-emerald-300">READY TO GO LIVE</p>
        <p className="text-xs text-white/40">Every critical requirement has passed.</p>
      </div>
      <button
        onClick={() => setOpen(true)}
        className="inline-flex items-center gap-2 rounded-xl bg-gradient-to-b from-emerald-300 to-emerald-500 px-5 py-2.5 text-sm font-bold text-emerald-950 shadow-glow transition hover:-translate-y-0.5"
      >
        <Radio size={15} /> GO LIVE
      </button>

      <div
        role="dialog"
        aria-hidden={!open}
        className={`surface-panel absolute right-0 top-full z-50 mt-2 w-80 origin-top-right p-4 transition-all duration-150 ease-out ${
          open ? "pointer-events-auto scale-100 opacity-100" : "pointer-events-none scale-95 opacity-0"
        }`}
      >
        <div className="mb-2 flex items-center justify-between">
          <p className="text-sm font-semibold text-white">Go Live isn&apos;t wired yet</p>
          <button onClick={() => setOpen(false)} className="text-white/40 hover:text-white" aria-label="Close">
            <X size={14} />
          </button>
        </div>
        <p className="text-xs leading-5 text-white/40">
          This confirms your production is ready — every critical requirement passes. Actually starting a broadcast
          (auto-publishing the Starting XI, notifying vMix, pushing to Website Sync) is a planned automation, not
          implemented here. See Future Automation below.
        </p>
      </div>
    </div>
  );
}
