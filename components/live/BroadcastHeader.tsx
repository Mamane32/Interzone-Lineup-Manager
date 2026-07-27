import Link from "next/link";
import { ArrowLeft, FileText, Radio } from "lucide-react";
import BrandBar from "./BrandBar";
import LiveStatusBadge from "./LiveStatusBadge";
import DateTimeClock from "./DateTimeClock";
import type { BrandingConfiguration } from "@/lib/branding";
import type { MatchLiveStatus } from "@/lib/types";

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

/**
 * Top Control Header — kept compact per the brief ("should not consume too
 * much vertical space"). System status chips are truthful placeholders:
 * "System Online" and "Database" are genuinely accurate (this page only
 * renders because both are true), "Graphics" and "Stream" are honestly
 * "not configured" / "offline" since no real integration exists yet — see
 * ProductionStatusPanel for the fuller, same-vocabulary breakdown.
 */
export default function BroadcastHeader({
  branding,
  matchToken,
  homeTeamName,
  awayTeamName,
  status,
  round,
}: {
  branding: BrandingConfiguration;
  matchToken: string;
  homeTeamName: string;
  awayTeamName: string;
  status: MatchLiveStatus;
  round: string | null;
}) {
  const isLive = LIVE_STATUSES.has(status);

  return (
    <header className="sticky top-0 z-30 border-b border-white/10 bg-[#05070a]/95 backdrop-blur">
      <div className="mx-auto flex max-w-[1600px] flex-wrap items-center justify-between gap-3 px-4 py-2.5">
        <div className="flex items-center gap-3">
          <Link href="/live" className="flex items-center gap-1.5 text-xs text-white/40 hover:text-white">
            <ArrowLeft size={14} /> Broadcast Control Center
          </Link>
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
          <div className="hidden items-center gap-1.5 lg:flex">
            <LiveStatusBadge label="System Online" tone="positive" />
            <LiveStatusBadge label="Database" tone="positive" />
            <LiveStatusBadge label="Graphics" tone="neutral" />
            <LiveStatusBadge label="Stream" tone="negative" />
          </div>
          <span
            className={`flex items-center gap-1.5 rounded-full px-3 py-1 text-[11px] font-bold uppercase tracking-wide ${
              isLive ? "bg-red-500/15 text-red-400" : "bg-white/10 text-white/50"
            }`}
          >
            <Radio size={11} className={isLive ? "animate-pulse" : ""} />
            {isLive && "LIVE · "}
            {STATUS_LABEL[status]}
          </span>
          <DateTimeClock />
          <Link
            href={`/live/${matchToken}/report`}
            className="flex items-center gap-1.5 rounded-lg bg-white/5 px-3 py-1.5 text-xs font-medium text-white/70 hover:bg-white/10 hover:text-white"
          >
            <FileText size={13} /> Report
          </Link>
        </div>
      </div>
    </header>
  );
}
