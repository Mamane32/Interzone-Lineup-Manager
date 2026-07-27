import Link from "next/link";
import { ChevronRight } from "lucide-react";
import StatusBadge from "@/components/ui/StatusBadge";
import { formatMatchDate } from "@/lib/utils";
import type { LineupStatus } from "@/lib/types";

export default function MatchListItem({
  token,
  matchId,
  opponentName,
  matchDate,
  matchTime,
  status,
}: {
  token: string;
  matchId: string;
  opponentName: string;
  matchDate: string;
  matchTime: string;
  status: LineupStatus;
}) {
  return (
    <Link
      href={`/team/${token}/lineup?match=${matchId}`}
      className="flex items-center justify-between gap-3 rounded-xl bg-coach-card p-3.5 shadow-sm transition-shadow hover:shadow-md"
    >
      <div>
        <p className="text-xs text-ink/40">{formatMatchDate(matchDate, matchTime)}</p>
        <p className="font-display font-semibold text-ink">Kont {opponentName}</p>
        <div className="mt-1">
          <StatusBadge status={status} />
        </div>
      </div>
      <ChevronRight size={18} className="flex-none text-ink/30" />
    </Link>
  );
}
