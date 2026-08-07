import Link from "next/link";
import { Play, Radio, Star } from "lucide-react";
import TeamCrest from "./TeamCrest";
import type { PublicBroadcast } from "@/lib/public-streaming";

function formatKickoff(date: string, time: string): string {
  return `${new Date(`${date}T12:00:00`).toLocaleDateString("fr-FR", { day: "numeric", month: "short" })} · ${time.slice(0, 5)}`;
}

/** One broadcast — live, upcoming, or a finished match's replay link. The watch button is a plain outbound link to the admin-entered stream_url (YouTube/Facebook/...), not an embed — see lib/public-streaming.ts's doc comment on why nothing here renders that URL in an iframe. */
export default function BroadcastCard({ broadcast }: { broadcast: PublicBroadcast }) {
  const isReplay = broadcast.liveStatus === "full_time";

  return (
    <div className="surface-panel flex flex-col gap-3 px-4 py-3.5">
      <div className="flex items-center justify-between gap-2">
        <span className="truncate text-[10px] font-semibold uppercase tracking-wide text-white/35">
          {broadcast.competitionName ?? "GGScoreLive"}
          {broadcast.round ? ` · ${broadcast.round}` : ""}
        </span>
        {broadcast.isFeatured && (
          <span className="flex flex-none items-center gap-1 rounded-full bg-brand-400/15 px-2 py-0.5 text-[9px] font-bold uppercase tracking-wide text-brand-400">
            <Star size={9} /> Featured
          </span>
        )}
      </div>

      <Link href={`/match/${broadcast.matchId}`} className="flex items-center justify-between gap-2">
        <span className="flex flex-1 items-center gap-2 truncate">
          <TeamCrest name={broadcast.homeTeam.name} logoUrl={broadcast.homeTeam.logoUrl} size={26} />
          <span className="truncate text-sm font-semibold text-white/90">{broadcast.homeTeam.name}</span>
        </span>
        <span className="flex-none font-display text-sm font-bold tabular-nums text-white">
          {broadcast.isLive || isReplay ? `${broadcast.homeScore} : ${broadcast.awayScore}` : formatKickoff(broadcast.matchDate, broadcast.matchTime)}
        </span>
        <span className="flex flex-1 items-center justify-end gap-2 truncate text-right">
          <span className="truncate text-sm font-semibold text-white/90">{broadcast.awayTeam.name}</span>
          <TeamCrest name={broadcast.awayTeam.name} logoUrl={broadcast.awayTeam.logoUrl} size={26} />
        </span>
      </Link>

      <a
        href={broadcast.streamUrl}
        target="_blank"
        rel="noopener noreferrer"
        className={`flex h-9 items-center justify-center gap-1.5 rounded-lg text-xs font-bold uppercase tracking-wide transition ${
          broadcast.isLive ? "bg-red-500 text-white hover:bg-red-400" : "bg-white/10 text-white/80 hover:bg-white/15"
        }`}
      >
        {broadcast.isLive ? (
          <>
            <Radio size={13} className="animate-pulse" /> Gade Live
          </>
        ) : isReplay ? (
          <>
            <Play size={13} /> Replay
          </>
        ) : (
          <>
            <Play size={13} /> Kanal Stream
          </>
        )}
      </a>
    </div>
  );
}
