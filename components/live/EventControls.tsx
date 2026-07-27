"use client";

import { useState } from "react";
import EventDialog from "./EventDialog";
import type { MatchEventType, Player, Team } from "@/lib/types";

export const EVENT_TYPES: { value: MatchEventType; label: string; needsTeamPlayer: boolean }[] = [
  { value: "yellow_card", label: "🟨 Yellow Card", needsTeamPlayer: true },
  { value: "second_yellow", label: "🟨🟥 Second Yellow", needsTeamPlayer: true },
  { value: "red_card", label: "🟥 Red Card", needsTeamPlayer: true },
  { value: "substitution", label: "🔁 Substitution", needsTeamPlayer: true },
  { value: "var", label: "📺 VAR", needsTeamPlayer: false },
  { value: "penalty_missed", label: "❌ Penalty Missed", needsTeamPlayer: true },
  { value: "injury", label: "🩹 Injury", needsTeamPlayer: true },
  { value: "match_start", label: "▶️ Match Start", needsTeamPlayer: false },
  { value: "half_time", label: "⏸️ Half Time", needsTeamPlayer: false },
  { value: "match_resume", label: "▶️ Match Resume", needsTeamPlayer: false },
  { value: "match_end", label: "⏹️ Match End", needsTeamPlayer: false },
];

export default function EventControls({
  matchId,
  homeTeam,
  awayTeam,
  homePlayers,
  awayPlayers,
}: {
  matchId: string;
  homeTeam: Team;
  awayTeam: Team;
  homePlayers: Player[];
  awayPlayers: Player[];
}) {
  const [active, setActive] = useState<MatchEventType | null>(null);
  const activeDef = EVENT_TYPES.find((e) => e.value === active);

  return (
    <div className="rounded-2xl border border-white/10 bg-white/[0.03] p-4">
      <h2 className="mb-3 text-xs font-semibold uppercase tracking-wide text-white/40">Match Events</h2>
      <div className="grid grid-cols-2 gap-1.5">
        {EVENT_TYPES.map((e) => (
          <button
            key={e.value}
            type="button"
            onClick={() => setActive(e.value)}
            className="rounded-lg bg-white/5 px-2 py-2 text-left text-[11px] font-medium text-white/70 transition-all hover:bg-white/10 active:scale-95"
          >
            {e.label}
          </button>
        ))}
      </div>

      {activeDef && (
        <EventDialog
          matchId={matchId}
          type={activeDef.value}
          label={activeDef.label}
          needsTeamPlayer={activeDef.needsTeamPlayer}
          homeTeam={homeTeam}
          awayTeam={awayTeam}
          homePlayers={homePlayers}
          awayPlayers={awayPlayers}
          onClose={() => setActive(null)}
        />
      )}
    </div>
  );
}
