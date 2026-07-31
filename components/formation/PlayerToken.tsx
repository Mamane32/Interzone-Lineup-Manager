"use client";

import type { Theme } from "@/lib/team-theme";
import type { PlacedPlayer } from "@/lib/formations";

export type { PlacedPlayer };

/** One player's card on the pitch — the drag surface itself. Pointer handlers are wired by the parent board, which owns drag state. */
export default function PlayerToken({
  player,
  theme,
  dragging,
  onPointerDown,
  onClick,
}: {
  player: PlacedPlayer;
  theme: Theme;
  dragging: boolean;
  onPointerDown: (e: React.PointerEvent) => void;
  onClick: () => void;
}) {
  return (
    <div
      className={`group absolute flex -translate-x-1/2 -translate-y-1/2 cursor-grab flex-col items-center gap-1 select-none touch-none ${
        dragging ? "z-30 cursor-grabbing" : "z-10"
      }`}
      style={{ left: `${player.x}%`, top: `${player.y}%` }}
      onPointerDown={onPointerDown}
      onClick={onClick}
      role="button"
      tabIndex={0}
      aria-label={`${player.fullName}, ${player.tacticalPosition}`}
    >
      <div
        className={`relative flex h-10 w-10 items-center justify-center rounded-full border-2 font-display text-sm font-black shadow-lg transition-transform ${
          dragging ? "scale-110" : "group-hover:scale-105"
        } ${player.goalkeeper ? "border-emerald-300 bg-emerald-500 text-emerald-950" : `${theme.border} ${theme.solid} ${theme.solidText}`}`}
      >
        {player.shirtNumber}
        {player.captain && (
          <span className="absolute -right-1 -top-1 flex h-4 w-4 items-center justify-center rounded-full bg-amber-signal text-[9px] font-bold text-ink shadow">
            C
          </span>
        )}
        {player.goalkeeper && (
          <span className="absolute -left-1 -bottom-1 rounded bg-surface-950 px-1 text-[7px] font-bold uppercase tracking-wide text-emerald-300">
            GK
          </span>
        )}
      </div>
      <span className="pointer-events-none whitespace-nowrap rounded-full bg-black/70 px-1.5 py-0.5 text-[9px] font-semibold text-white shadow backdrop-blur-sm">
        {player.tacticalPosition} · {player.fullName.split(" ").slice(-1)[0]}
      </span>
    </div>
  );
}
