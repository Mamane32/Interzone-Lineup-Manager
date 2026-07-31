"use client";

import { useMemo, useState } from "react";
import MatchTimelineEvent, { EVENT_META } from "./MatchTimelineEvent";
import type { MatchEvent, MatchEventType, Player, Team } from "@/lib/types";

export { EVENT_META };

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

/** Groups already-sorted events into broadcast periods by minute. Purely a display grouping — no new data. */
function groupByPeriod(events: MatchEvent[]) {
  const groups: { key: string; label: string; events: MatchEvent[] }[] = [
    { key: "first", label: "First Half", events: [] },
    { key: "second", label: "Second Half", events: [] },
    { key: "extra", label: "Extra Time", events: [] },
  ];
  for (const e of events) {
    const base = Number(e.minute.split("+")[0]);
    if (base <= 45) groups[0].events.push(e);
    else if (base <= 90) groups[1].events.push(e);
    else groups[2].events.push(e);
  }
  return groups.filter((g) => g.events.length > 0);
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

  const playersById = useMemo(() => {
    const map = new Map<string, Player>();
    [...homePlayers, ...awayPlayers].forEach((p) => map.set(p.id, p));
    return map;
  }, [homePlayers, awayPlayers]);

  const teamsById = useMemo(() => new Map([[homeTeam.id, homeTeam], [awayTeam.id, awayTeam]]), [homeTeam, awayTeam]);

  const activeFilter = FILTERS.find((f) => f.key === filter)!;
  const filtered = [...events]
    .filter((e) => activeFilter.types.length === 0 || activeFilter.types.includes(e.type))
    .sort((a, b) => minuteSort(a.minute, b.minute));
  const periods = groupByPeriod(filtered);

  return (
    <div className="flex h-full flex-col surface-panel">
      <div className="flex items-center justify-between border-b border-white/10 p-4 pb-3">
        <h2 className="text-xs font-semibold uppercase tracking-wide text-white/40">Match Timeline</h2>
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
        <div className="flex flex-col gap-4">
          {periods.map((group) => (
            <div key={group.key}>
              <p className="mb-1.5 px-1 text-[10px] font-bold uppercase tracking-wide text-white/25">{group.label}</p>
              <div className="flex flex-col gap-1.5">
                {group.events.map((e, i) => (
                  <MatchTimelineEvent
                    key={e.id}
                    matchId={matchId}
                    event={e}
                    player={e.player_id ? playersById.get(e.player_id) ?? null : null}
                    team={e.team_id ? teamsById.get(e.team_id) ?? null : null}
                    homeTeam={homeTeam}
                    awayTeam={awayTeam}
                    homePlayers={homePlayers}
                    awayPlayers={awayPlayers}
                    index={i}
                  />
                ))}
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
