import Link from "next/link";
import TeamCrest from "./TeamCrest";
import type { PublicScoreMatch } from "@/lib/public-scores";

function formatDay(date: string): { day: string; month: string } {
  const d = new Date(`${date}T12:00:00`);
  return { day: d.toLocaleDateString("fr-FR", { day: "numeric" }), month: d.toLocaleDateString("fr-FR", { month: "short" }) };
}

/**
 * Match Calendar's Timeline view — a vertical rail with one node per
 * match, distinct from the plain List view: it reads as a season's
 * chronological progression (round labels, live pulse on the rail itself)
 * rather than a flat fixture list, closer to what a "flagship" live-score
 * product's season timeline looks like.
 */
export default function CalendarTimelineView({ matches }: { matches: PublicScoreMatch[] }) {
  return (
    <div className="relative flex flex-col gap-4 pl-4">
      <div className="absolute bottom-2 left-[7px] top-2 w-px bg-white/[0.08]" aria-hidden="true" />
      {matches.map((m) => {
        const { day, month } = formatDay(m.matchDate);
        return (
          <Link key={m.matchId} href={`/match/${m.matchId}`} className="group relative flex items-start gap-3">
            <span
              className={`absolute -left-4 top-1.5 h-3.5 w-3.5 flex-none rounded-full border-2 border-surface-950 ${
                m.isLive ? "animate-pulse bg-red-400" : "bg-white/20 group-hover:bg-brand-400"
              }`}
              aria-hidden="true"
            />
            <div className="flex w-11 flex-none flex-col items-center pt-0.5">
              <span className="font-display text-lg font-bold leading-none text-white">{day}</span>
              <span className="text-[9px] font-semibold uppercase tracking-wide text-white/35">{month}</span>
            </div>
            <div className="surface-panel flex flex-1 items-center justify-between gap-2 px-3.5 py-2.5 transition group-hover:border-brand-400/25">
              <div className="flex min-w-0 flex-1 items-center gap-2">
                <TeamCrest name={m.homeTeam.name} logoUrl={m.homeTeam.logoUrl} size={22} />
                <span className="truncate text-xs font-medium text-white/85">{m.homeTeam.name}</span>
              </div>
              <span className="flex-none font-display text-xs font-bold tabular-nums text-white/70">
                {m.liveStatus === "pre_match" ? m.matchTime.slice(0, 5) : `${m.homeScore}–${m.awayScore}`}
              </span>
              <div className="flex min-w-0 flex-1 items-center justify-end gap-2 text-right">
                <span className="truncate text-xs font-medium text-white/85">{m.awayTeam.name}</span>
                <TeamCrest name={m.awayTeam.name} logoUrl={m.awayTeam.logoUrl} size={22} />
              </div>
            </div>
          </Link>
        );
      })}
    </div>
  );
}
