import { Check } from "lucide-react";
import type { ResolvedSlot } from "@/lib/bracket";
import TeamCrest from "@/components/scores/TeamCrest";

/** One side of a bracket matchup — a resolved team (optionally scored, optionally marked as the winner once the real match is finished) or a dashed "?" placeholder until its qualification slot resolves. */
export default function BracketSlot({ slot, score, isWinner = false }: { slot: ResolvedSlot; score?: number | null; isWinner?: boolean }) {
  if (slot.resolved) {
    return (
      <div className={`flex items-center gap-2.5 ${isWinner === false && score !== undefined && score !== null ? "opacity-50" : ""}`}>
        <TeamCrest name={slot.teamName} logoUrl={slot.logoUrl} size={24} />
        <span className={`truncate text-sm ${isWinner ? "font-bold text-white" : "font-semibold text-white/90"}`}>{slot.teamName}</span>
        {isWinner && <Check size={13} className="flex-none text-emerald-400" />}
        {score !== undefined && score !== null && <span className="ml-auto flex-none font-display text-sm font-bold tabular-nums text-white">{score}</span>}
      </div>
    );
  }
  return (
    <div className="flex items-center gap-2.5">
      <div className="flex h-6 w-6 flex-none items-center justify-center rounded-full border border-dashed border-white/20 text-[9px] text-white/30">?</div>
      <span className="truncate text-sm font-medium text-white/35">{slot.label}</span>
    </div>
  );
}
