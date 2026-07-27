import Link from "next/link";
import { MapPin, Clock } from "lucide-react";
import StatusBadge from "@/components/ui/StatusBadge";
import { getTheme } from "@/lib/team-theme";
import type { LineupStatus } from "@/lib/types";

/**
 * A premium match card — used on both the Dashboard's "upcoming" list and
 * the full Calendar. Themed per-opponent (via getTheme) so different
 * fixtures don't all read identically, with logos, competition label, and
 * time given visual priority per the Sprint 1 review.
 */
export default function MatchListItem({
  token,
  matchId,
  opponentName,
  opponentLogoUrl,
  homeTeamName,
  competitionName,
  matchDate,
  matchTime,
  status,
  index = 0,
}: {
  token: string;
  matchId: string;
  opponentName: string;
  opponentLogoUrl?: string | null;
  homeTeamName?: string;
  competitionName?: string | null;
  matchDate: string;
  matchTime: string;
  status: LineupStatus;
  index?: number;
}) {
  const theme = getTheme(opponentName);
  const dateObj = new Date(`${matchDate}T${matchTime}`);
  const day = dateObj.toLocaleDateString("fr-HT", { day: "2-digit" });
  const month = dateObj.toLocaleDateString("fr-HT", { month: "short" });
  const time = matchTime?.slice(0, 5);

  return (
    <Link
      href={`/team/${token}/lineup?match=${matchId}`}
      style={{ "--stagger": index } as React.CSSProperties}
      className="animate-fade-up group flex items-center gap-3 overflow-hidden rounded-2xl bg-coach-card shadow-sm ring-1 ring-black/5 transition-all hover:-translate-y-0.5 hover:shadow-lg active:scale-[0.99]"
    >
      {/* Date block, themed */}
      <div className={`flex h-full w-16 flex-none flex-col items-center justify-center gap-0.5 bg-gradient-to-b ${theme.heroFrom} ${theme.heroTo} py-4 text-white`}>
        <span className="font-display text-xl font-bold leading-none">{day}</span>
        <span className="text-[10px] uppercase tracking-wide text-white/70">{month}</span>
      </div>

      <div className="flex flex-1 items-center justify-between gap-2 py-3 pr-3">
        <div className="min-w-0">
          {competitionName && (
            <p className={`mb-0.5 truncate text-[10px] font-semibold uppercase tracking-wide ${theme.chipText}`}>
              {competitionName}
            </p>
          )}
          <div className="flex items-center gap-2">
            {opponentLogoUrl ? (
              // eslint-disable-next-line @next/next/no-img-element
              <img src={opponentLogoUrl} alt="" className={`h-6 w-6 flex-none rounded-full object-cover ring-1 ${theme.ring}`} />
            ) : (
              <span className={`flex h-6 w-6 flex-none items-center justify-center rounded-full text-[9px] font-bold ${theme.chipBg} ${theme.chipText}`}>
                {opponentName.slice(0, 2).toUpperCase()}
              </span>
            )}
            <p className="truncate font-display font-semibold text-ink">Kont {opponentName}</p>
          </div>
          <div className="mt-1.5 flex items-center gap-3 text-[11px] text-ink/40">
            <span className="flex items-center gap-1">
              <Clock size={11} /> {time}
            </span>
            {homeTeamName && (
              <span className="flex items-center gap-1 truncate">
                <MapPin size={11} /> Teren {homeTeamName}
              </span>
            )}
          </div>
        </div>
        <div className="flex-none transition-transform group-hover:translate-x-0.5">
          <StatusBadge status={status} />
        </div>
      </div>
    </Link>
  );
}
