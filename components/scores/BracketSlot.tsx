import type { ResolvedSlot } from "@/lib/bracket";
import TeamCrest from "@/components/scores/TeamCrest";

export default function BracketSlot({ slot }: { slot: ResolvedSlot }) {
  if (slot.resolved) {
    return (
      <div className="flex items-center gap-2.5">
        <TeamCrest name={slot.teamName} logoUrl={slot.logoUrl} size={24} />
        <span className="truncate text-sm font-semibold text-white/90">{slot.teamName}</span>
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
