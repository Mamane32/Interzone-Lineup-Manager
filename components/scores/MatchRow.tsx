import Link from "next/link";
import type { PublicScoreMatch } from "@/lib/public-scores";
import TeamCrest from "@/components/scores/TeamCrest";

const STATUS_LABEL: Record<string, string> = {
  pre_match: "",
  kickoff: "KO",
  first_half: "1MT",
  half_time: "MT",
  second_half: "2MT",
  extra_time: "TA",
  penalty_shootout: "TAB",
  full_time: "FT",
};

function kickoffTime(timeStr: string): string {
  return timeStr.slice(0, 5);
}

export default function MatchRow({ match }: { match: PublicScoreMatch }) {
  const isUpcoming = match.liveStatus === "pre_match";
  const statusTag = STATUS_LABEL[match.liveStatus];

  return (
    <Link
      href={`/match/${match.matchId}`}
      className="surface-panel flex items-center gap-3 px-4 py-3 transition hover:border-brand-400/25 hover:bg-white/[0.07]"
    >
      <div className="flex min-w-0 flex-1 items-center gap-2.5">
        <TeamCrest name={match.homeTeam.name} logoUrl={match.homeTeam.logoUrl} size={28} />
        <span className="truncate text-sm font-medium text-white/90">{match.homeTeam.name}</span>
      </div>

      <div className="flex flex-none flex-col items-center gap-0.5">
        {isUpcoming ? (
          <span className="font-display text-sm font-semibold tabular-nums text-white/50">{kickoffTime(match.matchTime)}</span>
        ) : (
          <span className="font-display text-base font-bold tabular-nums leading-none text-white">
            {match.homeScore}&ndash;{match.awayScore}
          </span>
        )}
        {match.isLive ? (
          <span className="flex items-center gap-1 text-[9px] font-bold uppercase tracking-wide text-red-400">
            <span className="h-1.5 w-1.5 animate-pulse rounded-full bg-red-400" /> {statusTag}
          </span>
        ) : statusTag ? (
          <span className="text-[9px] font-semibold uppercase tracking-wide text-white/30">{statusTag}</span>
        ) : null}
      </div>

      <div className="flex min-w-0 flex-1 items-center justify-end gap-2.5 text-right">
        <span className="truncate text-sm font-medium text-white/90">{match.awayTeam.name}</span>
        <TeamCrest name={match.awayTeam.name} logoUrl={match.awayTeam.logoUrl} size={28} />
      </div>
    </Link>
  );
}
