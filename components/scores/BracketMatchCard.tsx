import Link from "next/link";
import { Radio } from "lucide-react";
import BracketSlot from "./BracketSlot";
import type { BracketMatch } from "@/lib/public-bracket";

/**
 * One knockout fixture's card — a resolved-vs-resolved (or still-a-
 * placeholder) matchup, plus whatever the real match (once an admin has
 * created it) adds: a live pulse, the current/final score, and a winner
 * highlight. `animate-fade-up` (already gated by Brand Studio's Animation
 * Speed token — see app/globals.css) gives every card that newly resolves
 * a subtle entrance instead of just popping into place, which is as far
 * as "animated progression" goes for a server-rendered page with no
 * client-side transition system to animate *between* two renders.
 */
export default function BracketMatchCard({ match }: { match: BracketMatch }) {
  const finished = match.liveStatus === "full_time";
  const homeWinner = finished && match.homeScore !== null && match.awayScore !== null && match.homeScore > match.awayScore;
  const awayWinner = finished && match.homeScore !== null && match.awayScore !== null && match.awayScore > match.homeScore;

  const content = (
    <div className="animate-fade-up surface-panel flex flex-col gap-2 px-4 py-3 transition hover:border-brand-400/25">
      {match.isLive && (
        <span className="flex w-fit items-center gap-1.5 rounded-full bg-red-500 px-2 py-0.5 text-[9px] font-bold uppercase tracking-wide text-white">
          <Radio size={9} className="animate-pulse" /> Live
        </span>
      )}
      <BracketSlot slot={match.home} score={match.matchId ? match.homeScore : undefined} isWinner={homeWinner} />
      <div className="h-px bg-white/[0.06]" />
      <BracketSlot slot={match.away} score={match.matchId ? match.awayScore : undefined} isWinner={awayWinner} />
    </div>
  );

  return match.matchId ? (
    <Link href={`/match/${match.matchId}`} className="block">
      {content}
    </Link>
  ) : (
    content
  );
}
