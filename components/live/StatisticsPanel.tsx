import type { Team } from "@/lib/types";

// Per the brief: "Statistics may use placeholder values for now." These are
// static — no live data source exists yet (no stats table, no external
// feed). Wiring this to a real feed later only requires swapping this one
// array for a fetched one; the UI below doesn't change.
const PLACEHOLDER_STATS: { label: string; home: number; away: number; suffix?: string }[] = [
  { label: "Possession", home: 54, away: 46, suffix: "%" },
  { label: "Shots", home: 0, away: 0 },
  { label: "Shots on Target", home: 0, away: 0 },
  { label: "Corners", home: 0, away: 0 },
  { label: "Fouls", home: 0, away: 0 },
  { label: "Yellow Cards", home: 0, away: 0 },
  { label: "Red Cards", home: 0, away: 0 },
  { label: "Offside", home: 0, away: 0 },
  { label: "Saves", home: 0, away: 0 },
];

export default function StatisticsPanel({ homeTeam, awayTeam }: { homeTeam: Team; awayTeam: Team }) {
  return (
    <div className="rounded-2xl border border-white/10 bg-white/[0.03] p-4">
      <div className="mb-3 flex items-center justify-between">
        <h2 className="text-xs font-semibold uppercase tracking-wide text-white/40">Statistics</h2>
        <span className="rounded-full bg-white/5 px-2 py-0.5 text-[10px] font-medium text-white/30">
          Placeholder data
        </span>
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
                <div className="bg-blue-500" style={{ width: `${homePct}%` }} />
                <div className="flex-1 bg-red-500" />
              </div>
            </div>
          );
        })}
      </div>

      <p className="mt-3 truncate text-[10px] text-white/25">
        {homeTeam.name} vs {awayTeam.name} — live feed not yet connected
      </p>
    </div>
  );
}
