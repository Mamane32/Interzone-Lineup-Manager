import Link from "next/link";
import { AlertTriangle, ArrowRight, Check, Minus, Radio } from "lucide-react";
import type { MatchdayStatus, ReadinessCategory, ReadinessCheck, ReadinessReport } from "@/lib/readiness";
import { PLANNED_READINESS_CHECKS } from "@/lib/readiness";

const STATUS_META: Record<MatchdayStatus, { label: string; dot: string; text: string; ring: string }> = {
  ready: { label: "Ready For Broadcast", dot: "bg-emerald-400", text: "text-emerald-300", ring: "ring-emerald-400/25" },
  attention: { label: "Requires Attention", dot: "bg-amber-signal", text: "text-amber-signal", ring: "ring-amber-signal/25" },
  not_ready: { label: "Not Ready", dot: "bg-red-500", text: "text-red-400", ring: "ring-red-500/25" },
};

const CATEGORY_LABEL: Record<ReadinessCategory, string> = {
  foundation: "Foundation",
  lineup: "Lineup",
  tactical: "Tactical",
  production: "Production",
  integration: "Integration",
};

export default function BroadcastReadinessCenter({ report, matchId }: { report: ReadinessReport; matchId: string }) {
  const status = STATUS_META[report.matchdayStatus];
  const notTracked = report.checks.filter((c) => c.status === "not_tracked").length;

  const byCategory = report.checks.reduce<Record<string, ReadinessCheck[]>>((acc, check) => {
    (acc[check.category] ??= []).push(check);
    return acc;
  }, {});

  return (
    <div className="flex flex-col gap-4">
      {/* Score */}
      <div className={`surface-panel pitch-texture p-8 text-center ring-1 ${status.ring}`}>
        <span className={`mx-auto flex items-center gap-2 rounded-full bg-white/5 px-3 py-1 text-xs font-bold uppercase tracking-widest ${status.text}`}>
          <span className={`h-2 w-2 rounded-full ${status.dot}`} />
          {status.label}
        </span>
        <p className="mt-5 font-display text-7xl font-black tabular-nums tracking-tight">{report.scorePercent}%</p>
        <p className="mt-2 text-sm text-white/40">
          {report.passedCount} of {report.trackedCount} verified checks passing
          {notTracked > 0 && <span className="text-white/25"> · {notTracked} not yet tracked</span>}
        </p>
        <div className="mx-auto mt-6 h-1.5 w-full max-w-md overflow-hidden rounded-full bg-white/5">
          <div className={`h-full rounded-full transition-all ${status.dot}`} style={{ width: `${report.scorePercent}%` }} />
        </div>
      </div>

      {/* Checklist */}
      <div className="grid gap-4 sm:grid-cols-2">
        {Object.entries(byCategory).map(([category, checks]) => (
          <div key={category} className="surface-panel p-4">
            <p className="mb-3 text-xs font-semibold uppercase tracking-wide text-white/40">{CATEGORY_LABEL[category as ReadinessCategory]}</p>
            <div className="flex flex-col gap-1.5">
              {checks.map((c) => (
                <div key={c.id} className="flex items-center gap-2.5 rounded-lg px-2 py-1.5 text-sm">
                  {c.status === "pass" && (
                    <span className="flex h-5 w-5 flex-none items-center justify-center rounded-full bg-emerald-400/15 text-emerald-300"><Check size={12} /></span>
                  )}
                  {c.status === "warning" && (
                    <span className="flex h-5 w-5 flex-none items-center justify-center rounded-full bg-red-500/15 text-red-400"><AlertTriangle size={12} /></span>
                  )}
                  {c.status === "not_tracked" && (
                    <span className="flex h-5 w-5 flex-none items-center justify-center rounded-full bg-white/5 text-white/25"><Minus size={12} /></span>
                  )}
                  <span className={c.status === "not_tracked" ? "flex-1 text-white/30" : "flex-1 text-white/80"}>{c.label}</span>
                  {c.critical && c.status === "warning" && (
                    <span className="rounded-full bg-red-500/10 px-1.5 py-0.5 text-[8px] font-bold uppercase text-red-400">Blocks Go Live</span>
                  )}
                  {c.status === "not_tracked" && <span className="text-[9px] font-semibold uppercase text-white/20">Not tracked</span>}
                  {c.status === "warning" && c.actionHref && (
                    <Link href={c.actionHref} className="flex items-center gap-1 text-[11px] font-semibold text-brand-400 hover:text-brand-100">
                      {c.actionLabel} <ArrowRight size={10} />
                    </Link>
                  )}
                </div>
              ))}
            </div>
          </div>
        ))}
      </div>

      {/* Future-ready reference list */}
      <div className="surface-panel p-4">
        <p className="mb-1 flex items-center gap-2 text-xs font-semibold uppercase tracking-wide text-white/40">
          <Radio size={13} /> Planned checks
        </p>
        <p className="mb-3 text-[11px] text-white/25">Not evaluated yet — each becomes a real check the same way the ones above already are, no interface redesign required.</p>
        <div className="flex flex-wrap gap-1.5">
          {PLANNED_READINESS_CHECKS.map((c) => (
            <span key={c.id} className="rounded-full bg-white/[0.03] px-2.5 py-1 text-[11px] text-white/30">{c.label}</span>
          ))}
        </div>
      </div>
    </div>
  );
}
