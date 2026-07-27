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
      className={`rounded-2xl border p-5 transition-colors ${
        isLive ? "border-red-500/25 bg-gradient-to-b from-red-500/[0.04] to-white/[0.02]" : "border-white/10 bg-white/[0.03]"
      }`}
    >
      <div className="mb-4 flex items-center justify-center gap-2">
        {isLive && (
          <span className="flex items-center gap-1 rounded-full bg-red-500 px-2 py-0.5 text-[10px] font-bold uppercase tracking-wide text-white">
            <Radio size={10} className="animate-pulse" /> Live
          </span>
        )}
        <span className="rounded-full bg-white/8 px-2.5 py-0.5 text-[10px] font-semibold uppercase tracking-wide text-white/50">
          {STATUS_LABEL[status]}
        </span>
      </div>

      <div className="grid grid-cols-3 items-center gap-2">
        <TeamColumn team={homeTeam} />

        <div className="flex flex-col items-center gap-1">
          <div className="font-display text-5xl font-black tabular-nums leading-none">
            {homeScore} <span className="text-white/20">–</span> {awayScore}
          </div>
          <div className="mt-2 flex items-baseline gap-1">
            <span className="font-display text-lg font-bold tabular-nums text-white/80">{minuteLabel}</span>
            {additionalTimeLabel && (
              <span className="font-display text-xs font-semibold text-amber-signal">{additionalTimeLabel}</span>
            )}
          </div>
        </div>

        <TeamColumn team={awayTeam} align="right" />
      </div>

      {/* Small statistic placeholder — possession, per the brief */}
      <div className="mt-5 border-t border-white/10 pt-3">
        <div className="mb-1 flex items-center justify-between text-[11px] font-semibold text-white/60">
          <span>54%</span>
          <span className="text-white/30">Possession</span>
          <span>46%</span>
        </div>
        <div className="flex h-1 overflow-hidden rounded-full bg-white/5">
          <div className="bg-blue-500" style={{ width: "54%" }} />
          <div className="flex-1 bg-red-500" />
        </div>
      </div>
    </div>
  );
}

function TeamColumn({ team, align = "left" }: { team: Team; align?: "left" | "right" }) {
  return (
    <div className={`flex flex-col items-center gap-2 text-center ${align === "right" ? "" : ""}`}>
      {team.logo_url ? (
        // eslint-disable-next-line @next/next/no-img-element
        <img src={team.logo_url} alt="" className="h-14 w-14 rounded-full bg-white/10 object-cover ring-1 ring-white/15" />
      ) : (
        <div className="flex h-14 w-14 items-center justify-center rounded-full bg-white/10 font-display text-sm ring-1 ring-white/15">
          {team.name.slice(0, 2).toUpperCase()}
        </div>
      )}
      <span className="max-w-[7rem] truncate text-xs font-semibold text-white/90">{team.name}</span>
    </div>
  );
}
