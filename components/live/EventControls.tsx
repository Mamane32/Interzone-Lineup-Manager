"use client";

import { useState } from "react";
import EventDialog from "./EventDialog";
import type { MatchEventType, Player, Team } from "@/lib/types";

export const EVENT_TYPES: { value: MatchEventType; label: string; needsTeamPlayer: boolean; group: "discipline" | "flow" | "review" }[] = [
  { value: "yellow_card", label: "🟨 Yellow Card", needsTeamPlayer: true, group: "discipline" },
  { value: "second_yellow", label: "🟨🟥 Second Yellow", needsTeamPlayer: true, group: "discipline" },
  { value: "red_card", label: "🟥 Red Card", needsTeamPlayer: true, group: "discipline" },
  { value: "penalty_missed", label: "❌ Penalty Missed", needsTeamPlayer: true, group: "discipline" },
  { value: "injury", label: "🩹 Injury", needsTeamPlayer: true, group: "discipline" },
  { value: "substitution", label: "🔁 Substitution", needsTeamPlayer: true, group: "flow" },
  { value: "match_start", label: "▶️ Match Start", needsTeamPlayer: false, group: "flow" },
  { value: "half_time", label: "⏸️ Half Time", needsTeamPlayer: false, group: "flow" },
  { value: "match_resume", label: "▶️ Match Resume", needsTeamPlayer: false, group: "flow" },
  { value: "match_end", label: "⏹️ Match End", needsTeamPlayer: false, group: "flow" },
  { value: "var", label: "📺 VAR", needsTeamPlayer: false, group: "review" },
];

const GROUP_LABEL: Record<"discipline" | "flow" | "review", string> = {
  discipline: "Discipline",
  flow: "Match Flow",
  review: "Review",
};

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
    <div className="surface-panel p-4">
      <h2 className="mb-3 text-xs font-semibold uppercase tracking-wide text-white/40">Match Events</h2>
      <div className="flex flex-col gap-3">
        {(["discipline", "flow", "review"] as const).map((group) => (
          <div key={group}>
            <p className="mb-1.5 text-[9px] font-bold uppercase tracking-[0.15em] text-white/25">{GROUP_LABEL[group]}</p>
            <div className="grid grid-cols-2 gap-1.5">
              {EVENT_TYPES.filter((e) => e.group === group).map((e) => (
                <button
                  key={e.value}
                  type="button"
                  onClick={() => setActive(e.value)}
                  className="rounded-lg bg-white/5 px-2 py-2 text-left text-[11px] font-medium text-white/70 transition-all hover:-translate-y-0.5 hover:bg-white/10 active:scale-95 active:translate-y-0"
                >
                  {e.label}
                </button>
              ))}
            </div>
          </div>
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
