import Image from "next/image";
import { Radio } from "lucide-react";
import { deriveMatchClock } from "@/lib/match-clock";
import type { MatchEvent, MatchLiveStatus, Team } from "@/lib/types";

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

export default function MatchScorePanel({
  homeTeam,
  awayTeam,
  homeScore,
  awayScore,
  status,
  events,
}: {
  homeTeam: Team;
  awayTeam: Team;
  homeScore: number;
  awayScore: number;
  status: MatchLiveStatus;
  events: MatchEvent[];
}) {
  const isLive = LIVE_STATUSES.has(status);
  const { minuteLabel, additionalTimeLabel } = deriveMatchClock(status, events);

  return (
    <div
      className={`surface-panel pitch-texture p-6 ${isLive ? "border-red-500/25" : ""}`}
      style={isLive ? { boxShadow: "0 0 0 1px rgba(239,68,68,.15), 0 30px 70px -30px rgba(239,68,68,.35)" } : undefined}
    >
      <div className="mb-5 flex items-center justify-center gap-2">
        {isLive && (
          <span className="flex items-center gap-1.5 rounded-full bg-red-500 px-2.5 py-0.5 text-[10px] font-bold uppercase tracking-wide text-white">
            <Radio size={10} className="animate-pulse" /> On Air
          </span>
        )}
        <span className="rounded-full bg-white/8 px-2.5 py-0.5 text-[10px] font-semibold uppercase tracking-wide text-white/50">
          {STATUS_LABEL[status]}
        </span>
      </div>

      <div className="grid grid-cols-[1fr_auto_1fr] items-center gap-2">
        <TeamColumn team={homeTeam} />

        <div className="flex flex-col items-center gap-1">
          <div className="whitespace-nowrap font-display text-4xl font-black tabular-nums leading-none tracking-tight sm:text-6xl">
            {homeScore} <span className="text-white/15">–</span> {awayScore}
          </div>
          <div className="mt-3 flex items-baseline gap-1.5 rounded-full bg-white/5 px-3 py-1">
            <span className="font-display text-lg font-bold tabular-nums text-white/80">{minuteLabel}</span>
            {additionalTimeLabel && (
              <span className="font-display text-xs font-semibold text-amber-signal">{additionalTimeLabel}</span>
            )}
          </div>
        </div>

        <TeamColumn team={awayTeam} align="right" />
      </div>

      {/* Possession used to be a hardcoded 54/46 placeholder here — removed
          rather than carried forward, since Sprint 3's Match Statistics
          phase gives StatisticsPanel real data. One real number in one
          place beats two components independently guessing the same stat. */}
    </div>
  );
}

function TeamColumn({ team, align = "left" }: { team: Team; align?: "left" | "right" }) {
  return (
    <div className={`flex flex-col items-center gap-2 text-center ${align === "right" ? "" : ""}`}>
      {team.logo_url ? (
        <Image src={team.logo_url} alt="" width={56} height={56} className="h-14 w-14 rounded-full bg-white/10 object-cover ring-1 ring-white/15" />
      ) : (
        <div className="flex h-14 w-14 items-center justify-center rounded-full bg-white/10 font-display text-sm ring-1 ring-white/15">
          {team.name.slice(0, 2).toUpperCase()}
        </div>
      )}
      <span className="max-w-[7rem] truncate text-xs font-semibold text-white/90">{team.name}</span>
    </div>
  );
}
