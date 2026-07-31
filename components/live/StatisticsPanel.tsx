import SectionHeader from "./SectionHeader";
import { getTheme } from "@/lib/team-theme";
import type { Team } from "@/lib/types";

// Per the brief: "Statistics may use placeholder values for now" / "The
// statistics panel should be reusable with real Supabase data later."
// Static — no stats table exists. Swapping in a real feed later only means
// replacing this array with a fetched one; the comparison-bar UI below
// doesn't change.
const PLACEHOLDER_STATS: { label: string; home: number; away: number; suffix?: string }[] = [
  { label: "Possession", home: 54, away: 46, suffix: "%" },
  { label: "Expected Goals (xG)", home: 0, away: 0 },
  { label: "Shots", home: 0, away: 0 },
  { label: "Shots on Target", home: 0, away: 0 },
  { label: "Passes", home: 0, away: 0 },
  { label: "Pass Accuracy", home: 0, away: 0, suffix: "%" },
  { label: "Corners", home: 0, away: 0 },
  { label: "Fouls", home: 0, away: 0 },
  { label: "Offside", home: 0, away: 0 },
  { label: "Saves", home: 0, away: 0 },
  { label: "Yellow Cards", home: 0, away: 0 },
  { label: "Red Cards", home: 0, away: 0 },
];

export default function StatisticsPanel({ homeTeam, awayTeam }: { homeTeam: Team; awayTeam: Team }) {
  const homeTheme = getTheme(homeTeam.name);
  const awayTheme = getTheme(awayTeam.name);

  return (
    <div className="surface-panel p-4">
      <SectionHeader
        title="Match Statistics"
        badge={<span className="rounded-full bg-white/5 px-2 py-0.5 text-[10px] font-medium text-white/30">Placeholder data</span>}
      />

      <div className="mb-3 flex items-center justify-between text-[10px] font-semibold uppercase tracking-wide text-white/30">
        <span>{homeTeam.name.slice(0, 3).toUpperCase()}</span>
        <span>{awayTeam.name.slice(0, 3).toUpperCase()}</span>
      </div>

      <div className="flex flex-col gap-3">
        {PLACEHOLDER_STATS.map((s) => {
          const total = s.home + s.away || 1;
          const homePct = (s.home / total) * 100;
          return (
            <div key={s.label}>
              <div className="mb-1 flex items-center justify-between text-xs">
                <span className="w-10 font-semibold text-white/80">
                  {s.home}
                  {s.suffix ?? ""}
                </span>
                <span className="text-white/40">{s.label}</span>
                <span className="w-10 text-right font-semibold text-white/80">
                  {s.away}
                  {s.suffix ?? ""}
                </span>
              </div>
              <div className="flex h-1.5 overflow-hidden rounded-full bg-white/5">
                <div className={homeTheme.solid} style={{ width: `${homePct}%` }} />
                <div className={`flex-1 ${awayTheme.solid}`} />
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}
