"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { FileText, Gauge, Radio, Shirt, LayoutGrid, ExternalLink } from "lucide-react";
import BrandMark from "@/components/brand/BrandMark";
import BrandBar from "./BrandBar";
import DateTimeClock from "./DateTimeClock";
import LiveAlerts from "./LiveAlerts";
import { deriveLiveAlerts, type LiveAlert } from "@/lib/live-alerts";
import { systemsWithVMixState, STATE_TONE, STATE_LABEL, type SystemState } from "./ProductionStatusPanel";
import type { BrandingConfiguration } from "@/lib/branding";
import type { LineupStatus, MatchLiveStatus } from "@/lib/types";
import type { MatchdayStatus, ReadinessReport } from "@/lib/readiness";

const READINESS_META: Record<MatchdayStatus, { chipClass: string; dot: string }> = {
  ready: { chipClass: "bg-emerald-400/15 text-emerald-300", dot: "bg-emerald-400" },
  attention: { chipClass: "bg-amber-signal/15 text-amber-signal", dot: "bg-amber-signal" },
  not_ready: { chipClass: "bg-red-500/15 text-red-400", dot: "bg-red-500" },
};

const STATUS_LABEL: Record<MatchLiveStatus, string> = {
  pre_match: "Scheduled",
  kickoff: "Kick Off",
  first_half: "First Half",
  half_time: "Half-time",
  second_half: "Second Half",
  extra_time: "Additional Time",
  penalty_shootout: "Penalties",
  full_time: "Full-time",
};

const LIVE_STATUSES = new Set<MatchLiveStatus>(["kickoff", "first_half", "second_half", "extra_time", "penalty_shootout"]);

// The condensed, always-visible subset of ProductionStatusPanel's full
// system list — the Mission Control strip; the full panel is still one tab
// away for detail, this is "can I trust what's on air right now, at a
// glance."
const STRIP_SYSTEM_KEYS = ["stream", "graphics", "vmix", "recording"];

/**
 * Top Control Header — shared by every module under /live/[matchId]/**
 * (Control Room, Formation, Readiness, Report) via the layout that renders
 * it, so this one header IS already the persistent cross-module nav — the
 * Phase 4 review's finding was that it didn't *feel* like one: no
 * permanent brand shortcut back to the Overview, and Formation/Readiness/
 * Report read as three unrelated buttons rather than one nav cluster with
 * a "you are here" state. Both fixed here: `BrandMark` (the same GG crest
 * used everywhere else in the product, not a new one) links straight back
 * to Admin -> Dashboard for admin/super_admin, or /live for a
 * broadcast_operator without dashboard access (see `homeHref`, set by the
 * layout from the signed-in user's role) — and all four modules now render
 * as one active-state-aware nav group.
 */
export default function BroadcastHeader({
  branding,
  homeHref = "/live",
  matchToken,
  homeTeamName,
  awayTeamName,
  status,
  round,
  homeLineupStatus,
  awayLineupStatus,
  vmixState,
  readiness,
}: {
  branding: BrandingConfiguration;
  homeHref?: string;
  matchToken: string;
  homeTeamName: string;
  awayTeamName: string;
  status: MatchLiveStatus;
  round: string | null;
  homeLineupStatus: LineupStatus | null;
  awayLineupStatus: LineupStatus | null;
  vmixState: SystemState;
  readiness: ReadinessReport;
}) {
  const pathname = usePathname();
  const isLive = LIVE_STATUSES.has(status);
  const matchAlerts = deriveLiveAlerts({ isLive, homeTeamName, awayTeamName, homeLineupStatus, awayLineupStatus, vmixState });
  // Readiness warnings surface inside the same Mission Control alerts feed
  // — one alerts UI, fed by two real sources, not a second alerts system.
  const readinessAlerts: LiveAlert[] = readiness.checks
    .filter((c) => c.status === "warning")
    .map((c) => ({ id: `readiness-${c.id}`, label: c.warningLabel ?? c.label, severity: "warning" }));
  const alerts = [...matchAlerts, ...readinessAlerts];
  const readinessMeta = READINESS_META[readiness.matchdayStatus];
  const stripSystems = systemsWithVMixState(vmixState).filter((s) => STRIP_SYSTEM_KEYS.includes(s.key));

  const base = `/live/${matchToken}`;
  const modules = [
    { href: base, label: "Control Room", icon: LayoutGrid },
    { href: `${base}/formation`, label: "Formation", icon: Shirt },
    { href: `${base}/readiness`, label: `Readiness · ${readiness.scorePercent}%`, icon: Gauge },
    { href: `${base}/report`, label: "Report", icon: FileText },
  ];

  return (
    <header className={`sticky top-0 z-30 border-b bg-black/90 backdrop-blur-xl transition-colors ${isLive ? "border-red-500/25" : "border-white/10"}`}>
      <div className="mx-auto flex max-w-[1600px] flex-wrap items-center justify-between gap-3 px-4 py-2.5">
        <div className="flex items-center gap-3">
          <BrandMark compact size="sm" href={homeHref} className="flex-none" />
          <span className="hidden h-4 w-px bg-white/10 sm:block" />
          <div className="hidden sm:block">
            <BrandBar branding={branding} compact />
          </div>
        </div>

        <div className="flex items-center gap-2 text-xs text-white/50">
          <p className="font-display font-semibold text-white">
            {homeTeamName} <span className="text-white/30">vs</span> {awayTeamName}
          </p>
          {round && <span className="hidden text-white/30 md:inline">· {round}</span>}
        </div>

        <div className="flex items-center gap-2">
          <a
            href={`/broadcast-output/${matchToken}/program`}
            target="_blank"
            rel="noopener noreferrer"
            className="flex items-center gap-1 rounded-full bg-white/5 px-2.5 py-1 text-[10px] font-semibold text-white/45 transition hover:bg-white/10 hover:text-white"
            title="Open Program output in a new window — pop it out to a second monitor or external display"
          >
            <ExternalLink size={10} /> Program
          </a>
          <a
            href={`/broadcast-output/${matchToken}/preview`}
            target="_blank"
            rel="noopener noreferrer"
            className="flex items-center gap-1 rounded-full bg-white/5 px-2.5 py-1 text-[10px] font-semibold text-white/45 transition hover:bg-white/10 hover:text-white"
            title="Open Preview output in a new window"
          >
            <ExternalLink size={10} /> Preview
          </a>
          <span
            className={`flex items-center gap-1.5 rounded-full px-3 py-1 text-[11px] font-bold uppercase tracking-wide ${
              isLive ? "bg-red-500/15 text-red-400" : "bg-white/10 text-white/50"
            }`}
          >
            {isLive ? (
              <span className="relative flex h-2 w-2">
                <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-red-500 opacity-75" />
                <span className="relative inline-flex h-2 w-2 rounded-full bg-red-500" />
              </span>
            ) : (
              <Radio size={11} />
            )}
            {isLive && "LIVE · "}
            {STATUS_LABEL[status]}
          </span>
          <DateTimeClock />
        </div>
      </div>

      {/* Module nav — one cluster, one "you are here" state, instead of a
          readiness chip styled differently from Formation/Report buttons. */}
      <div className="border-t border-white/[0.06] bg-white/[0.02]">
        <div className="mx-auto flex max-w-[1600px] items-center gap-1 overflow-x-auto px-4 py-1.5">
          {modules.map((m) => {
            const active = m.href === base ? pathname === base : pathname.startsWith(m.href);
            return (
              <Link
                key={m.href}
                href={m.href}
                className={`flex flex-none items-center gap-1.5 whitespace-nowrap rounded-lg px-3 py-1.5 text-xs font-semibold transition-colors ${
                  active ? "bg-white text-black" : "text-white/60 hover:bg-white/10 hover:text-white"
                }`}
              >
                <m.icon size={13} />
                {m.label}
                {m.href === `${base}/readiness` && (
                  <span className={`ml-1 flex h-1.5 w-1.5 rounded-full ${readinessMeta.dot}`} aria-label={`${readiness.scorePercent}% ready`} />
                )}
              </Link>
            );
          })}
        </div>
      </div>

      {/* Mission Control strip */}
      <div className="border-t border-white/[0.06] bg-white/[0.015]">
        <div className="mx-auto flex max-w-[1600px] items-center gap-4 overflow-x-auto px-4 py-1.5">
          <span className="flex-none text-[9px] font-bold uppercase tracking-[0.2em] text-white/25">On Air</span>
          <div className="flex flex-none items-center gap-3">
            {stripSystems.map((s) => (
              <span key={s.key} className="flex items-center gap-1.5 whitespace-nowrap text-[10px] font-medium text-white/45">
                <span
                  className={`h-1.5 w-1.5 rounded-full ${
                    STATE_TONE[s.state] === "positive" ? "bg-emerald-400" : STATE_TONE[s.state] === "negative" ? "bg-red-500" : "bg-white/25"
                  }`}
                />
                {s.label} <span className="text-white/25">{STATE_LABEL[s.state]}</span>
              </span>
            ))}
          </div>
          <span className="ml-auto flex-none">
            <LiveAlerts alerts={alerts} />
          </span>
        </div>
      </div>
    </header>
  );
}
