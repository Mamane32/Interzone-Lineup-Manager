import Link from "next/link";
import { Radio } from "lucide-react";
import type { PublicScoreMatch } from "@/lib/public-scores";
import TeamCrest from "@/components/scores/TeamCrest";

export default function LiveNowCard({ match }: { match: PublicScoreMatch }) {
  return (
    <Link
      href={`/match/${match.matchId}`}
      className="surface-panel pitch-texture flex w-64 flex-none flex-col gap-4 p-4 transition hover:border-brand-400/30"
    >
      <div className="flex items-center justify-between">
        <span className="flex items-center gap-1.5 rounded-full bg-red-500 px-2 py-0.5 text-[10px] font-bold uppercase tracking-wide text-white">
          <Radio size={10} className="animate-pulse" /> Live
        </span>
        {match.competitionName && <span className="truncate text-[10px] uppercase tracking-wide text-white/35">{match.competitionName}</span>}
      </div>
      <div className="grid grid-cols-3 items-center gap-1">
        <div className="flex flex-col items-center gap-1.5 text-center">
          <TeamCrest name={match.homeTeam.name} logoUrl={match.homeTeam.logoUrl} size={36} />
          <span className="line-clamp-2 text-[11px] font-semibold leading-tight text-white/85">{match.homeTeam.name}</span>
        </div>
        <p className="text-center font-display text-2xl font-black tabular-nums leading-none">
          {match.homeScore}&ndash;{match.awayScore}
        </p>
        <div className="flex flex-col items-center gap-1.5 text-center">
          <TeamCrest name={match.awayTeam.name} logoUrl={match.awayTeam.logoUrl} size={36} />
          <span className="line-clamp-2 text-[11px] font-semibold leading-tight text-white/85">{match.awayTeam.name}</span>
        </div>
      </div>
    </Link>
  );
}
