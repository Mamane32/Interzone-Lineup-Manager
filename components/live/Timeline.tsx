"use client";

import { useMemo, useState, useTransition } from "react";
import { Trash2 } from "lucide-react";
import { deleteMatchEvent } from "@/app/live/[matchId]/actions";
import type { MatchEvent, MatchEventType, Player, Team } from "@/lib/types";

export const EVENT_META: Record<MatchEventType, { icon: string; label: string }> = {
  goal: { icon: "⚽", label: "Goal" },
  penalty_goal: { icon: "⚽", label: "Penalty Goal" },
  own_goal: { icon: "⚽", label: "Own Goal" },
  yellow_card: { icon: "🟨", label: "Yellow Card" },
  second_yellow: { icon: "🟨🟥", label: "Second Yellow" },
  red_card: { icon: "🟥", label: "Red Card" },
  substitution: { icon: "🔁", label: "Substitution" },
  var: { icon: "📺", label: "VAR" },
  penalty_missed: { icon: "❌", label: "Penalty Missed" },
  injury: { icon: "🩹", label: "Injury" },
  match_start: { icon: "▶️", label: "Match Start" },
  half_time: { icon: "⏸️", label: "Half Time" },
  match_resume: { icon: "▶️", label: "Match Resume" },
  match_end: { icon: "⏹️", label: "Match End" },
};

const FILTERS: { key: string; label: string; types: MatchEventType[] }[] = [
  { key: "all", label: "All", types: [] },
  { key: "goals", label: "Goals", types: ["goal", "penalty_goal", "own_goal"] },
  { key: "cards", label: "Cards", types: ["yellow_card", "second_yellow", "red_card"] },
  { key: "subs", label: "Subs", types: ["substitution"] },
  { key: "other", label: "Other", types: ["var", "penalty_missed", "injury", "match_start", "half_time", "match_resume", "match_end"] },
];

export function minuteSort(a: string, b: string) {
  const parse = (m: string) => {
    const [base, extra] = m.split("+").map(Number);
    return base * 100 + (extra || 0);
  };
  return parse(a) - parse(b);
}

export default function Timeline({
  matchId,
  events,
  homeTeam,
  awayTeam,
  homePlayers,
  awayPlayers,
}: {
  matchId: string;
  events: MatchEvent[];
  homeTeam: Team;
  awayTeam: Team;
  homePlayers: Player[];
  awayPlayers: Player[];
}) {
  const [filter, setFilter] = useState("all");
  const [pending, startTransition] = useTransition();

  const playersById = useMemo(() => {
    const map = new Map<string, Player>();
    [...homePlayers, ...awayPlayers].forEach((p) => map.set(p.id, p));
    return map;
  }, [homePlayers, awayPlayers]);

  const teamsById = useMemo(
    () => new Map([[homeTeam.id, homeTeam], [awayTeam.id, awayTeam]]),
    [homeTeam, awayTeam]
  );

  const activeFilter = FILTERS.find((f) => f.key === filter)!;
  const filtered = [...events]
    .filter((e) => activeFilter.types.length === 0 || activeFilter.types.includes(e.type))
    .sort((a, b) => minuteSort(a.minute, b.minute));

  function remove(id: string) {
    startTransition(() => {
      deleteMatchEvent(matchId, id);
    });
  }

  return (
    <div className="flex h-full flex-col rounded-2xl border border-white/10 bg-white/[0.03]">
      <div className="flex items-center justify-between border-b border-white/10 p-4 pb-3">
        <h2 className="text-xs font-semibold uppercase tracking-wide text-white/40">Timeline</h2>
      </div>

      <div className="flex gap-1 overflow-x-auto border-b border-white/10 px-4 py-2">
        {FILTERS.map((f) => (
          <button
            key={f.key}
            onClick={() => setFilter(f.key)}
            className={`whitespace-nowrap rounded-full px-2.5 py-1 text-[11px] font-semibold ${
              filter === f.key ? "bg-white text-black" : "bg-white/5 text-white/50 hover:bg-white/10"
            }`}
          >
            {f.label}
          </button>
        ))}
      </div>

      <div className="flex-1 overflow-y-auto p-3">
        {filtered.length === 0 && <p className="p-4 text-center text-xs text-white/30">No events yet.</p>}
        <div className="flex flex-col gap-1.5">
          {filtered.map((e) => {
            const meta = EVENT_META[e.type];
            const player = e.player_id ? playersById.get(e.player_id) : null;
            const team = e.team_id ? teamsById.get(e.team_id) : null;
            return (
              <div
                key={e.id}
                className="group flex items-center gap-3 rounded-xl bg-white/[0.03] px-3 py-2 hover:bg-white/[0.06]"
              >
                <span className="w-10 flex-none text-center font-display text-xs font-bold text-white/50">
                  {e.minute}&apos;
                </span>
                <span className="text-base">{meta.icon}</span>
                <div className="min-w-0 flex-1">
                  <p className="truncate text-xs font-semibold text-white/90">
                    {meta.label}
                    {team ? ` · ${team.name}` : ""}
                  </p>
                  {(player || e.description) && (
                    <p className="truncate text-[11px] text-white/40">
                      {player ? `${String(player.number).padStart(2, "0")} ${player.full_name}` : ""}
                      {player && e.description ? " — " : ""}
                      {e.description ?? ""}
                    </p>
                  )}
                </div>
                <button
                  type="button"
                  onClick={() => remove(e.id)}
                  disabled={pending}
                  className="flex-none text-white/0 transition-colors group-hover:text-white/30 hover:!text-red-400"
                  aria-label="Remove event"
                >
                  <Trash2 size={13} />
                </button>
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
}
