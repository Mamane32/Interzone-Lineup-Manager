"use client";

import { useTransition } from "react";
import { Minus, Plus } from "lucide-react";
import SectionHeader from "./SectionHeader";
import { adjustStatistic, adjustPossessionStat } from "@/app/live/[matchId]/statistics-actions";
import { getTheme } from "@/lib/team-theme";
import type { StatField } from "@/lib/match-statistics";
import type { MatchStatistics, Team } from "@/lib/types";

const COUNTER_STATS: { field: StatField; label: string }[] = [
  { field: "shots", label: "Shots" },
  { field: "shots_on_target", label: "Shots on Target" },
  { field: "corners", label: "Corners" },
  { field: "fouls", label: "Fouls" },
  { field: "offside", label: "Offside" },
  { field: "yellow_cards", label: "Yellow Cards" },
  { field: "red_cards", label: "Red Cards" },
  { field: "saves", label: "Saves" },
];

/**
 * Match Statistics — Sprint 3's Match Statistics Engine. Real, persisted,
 * operator-driven data (lib/match-statistics.ts / match_statistics table)
 * replacing what used to be a hardcoded PLACEHOLDER_STATS array. Every
 * counter here is independent of the Timeline's own event log by product
 * decision — logging a Yellow Card event does not move this panel's
 * Yellow Cards count, and vice versa; this is the one place these nine
 * statistics are counted, one click at a time.
 *
 * Possession is the one non-independent stat: incrementing one team's
 * share decrements the other's by the same amount in the same call
 * (lib/match-statistics.ts's adjustPossession), so the two always sum to
 * 100 — every other counter here has no such constraint.
 */
export default function StatisticsPanel({
  matchId,
  homeTeam,
  awayTeam,
  homeStats,
  awayStats,
  readOnly = false,
}: {
  matchId: string;
  homeTeam: Team;
  awayTeam: Team;
  homeStats: MatchStatistics;
  awayStats: MatchStatistics;
  /** The Match Report's finished-match summary reuses this same panel but shouldn't offer live +/- edits — everything else about the layout stays identical. */
  readOnly?: boolean;
}) {
  const homeTheme = getTheme(homeTeam.name);
  const awayTheme = getTheme(awayTeam.name);
  const [pending, startTransition] = useTransition();

  function adjust(teamId: string, field: StatField, delta: number) {
    startTransition(() => {
      adjustStatistic(matchId, teamId, field, delta);
    });
  }

  function adjustPossessionFor(teamId: string, opponentTeamId: string, delta: number) {
    startTransition(() => {
      adjustPossessionStat(matchId, teamId, opponentTeamId, delta);
    });
  }

  const possessionTotal = homeStats.possession_percent + awayStats.possession_percent || 1;
  const homePossessionPct = (homeStats.possession_percent / possessionTotal) * 100;

  return (
    <div className="surface-panel p-4">
      <SectionHeader title="Match Statistics" badge={<span className="rounded-full bg-white/5 px-2 py-0.5 text-[10px] font-medium text-white/30">Live</span>} />

      <div className="mb-3 flex items-center justify-between text-[10px] font-semibold uppercase tracking-wide text-white/30">
        <span>{homeTeam.name.slice(0, 3).toUpperCase()}</span>
        <span>{awayTeam.name.slice(0, 3).toUpperCase()}</span>
      </div>

      <div className="flex flex-col gap-3">
        {/* Possession — the one zero-sum stat */}
        <div>
          <div className="mb-1 flex items-center justify-between text-xs">
            <CounterControl value={homeStats.possession_percent} suffix="%" readOnly={readOnly} disabled={pending} onDecrement={() => adjustPossessionFor(homeTeam.id, awayTeam.id, -1)} onIncrement={() => adjustPossessionFor(homeTeam.id, awayTeam.id, 1)} />
            <span className="text-white/40">Possession</span>
            <CounterControl value={awayStats.possession_percent} suffix="%" align="right" readOnly={readOnly} disabled={pending} onDecrement={() => adjustPossessionFor(awayTeam.id, homeTeam.id, -1)} onIncrement={() => adjustPossessionFor(awayTeam.id, homeTeam.id, 1)} />
          </div>
          <div className="flex h-1.5 overflow-hidden rounded-full bg-white/5">
            <div className={homeTheme.solid} style={{ width: `${homePossessionPct}%` }} />
            <div className={`flex-1 ${awayTheme.solid}`} />
          </div>
        </div>

        {COUNTER_STATS.map((s) => {
          const home = homeStats[s.field];
          const away = awayStats[s.field];
          const total = home + away || 1;
          const homePct = (home / total) * 100;
          return (
            <div key={s.field}>
              <div className="mb-1 flex items-center justify-between text-xs">
                <CounterControl value={home} readOnly={readOnly} disabled={pending} onDecrement={() => adjust(homeTeam.id, s.field, -1)} onIncrement={() => adjust(homeTeam.id, s.field, 1)} />
                <span className="text-white/40">{s.label}</span>
                <CounterControl value={away} align="right" readOnly={readOnly} disabled={pending} onDecrement={() => adjust(awayTeam.id, s.field, -1)} onIncrement={() => adjust(awayTeam.id, s.field, 1)} />
              </div>
              <div className="flex h-1.5 overflow-hidden rounded-full bg-white/5">
                <div className={homeTheme.solid} style={{ width: `${homePct}%` }} />
                <div className={`flex-1 ${awayTheme.solid}`} />
              </div>
            </div>
          );
        })}

        {/* Expected Goals — architecture only, per product decision. No calculation engine yet. */}
        <div className="flex items-center justify-between border-t border-white/10 pt-3 text-xs">
          <span className="w-10 font-semibold text-white/30">—</span>
          <span className="text-white/30">Expected Goals (xG)</span>
          <span className="w-10 text-right font-semibold text-white/30">—</span>
        </div>
      </div>
    </div>
  );
}

function CounterControl({
  value,
  suffix = "",
  align = "left",
  readOnly = false,
  disabled,
  onDecrement,
  onIncrement,
}: {
  value: number;
  suffix?: string;
  align?: "left" | "right";
  readOnly?: boolean;
  disabled: boolean;
  onDecrement: () => void;
  onIncrement: () => void;
}) {
  const buttons = (
    <>
      <button
        type="button"
        onClick={onDecrement}
        disabled={disabled || value <= 0}
        aria-label="Decrease"
        className="flex h-5 w-5 items-center justify-center rounded bg-white/5 text-white/50 hover:bg-white/15 hover:text-white disabled:opacity-20"
      >
        <Minus size={10} />
      </button>
      <button
        type="button"
        onClick={onIncrement}
        disabled={disabled}
        aria-label="Increase"
        className="flex h-5 w-5 items-center justify-center rounded bg-white/5 text-white/50 hover:bg-white/15 hover:text-white disabled:opacity-20"
      >
        <Plus size={10} />
      </button>
    </>
  );

  return (
    <div className={`flex items-center gap-1 ${align === "right" ? "flex-row-reverse" : ""}`}>
      <span className="w-8 text-center font-semibold text-white/80">
        {value}
        {suffix}
      </span>
      {!readOnly && buttons}
    </div>
  );
}
