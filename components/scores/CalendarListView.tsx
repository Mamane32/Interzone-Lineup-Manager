import MatchRow from "./MatchRow";
import type { PublicScoreMatch } from "@/lib/public-scores";

function formatDateHeading(date: string): string {
  return new Date(`${date}T12:00:00`).toLocaleDateString("fr-FR", { weekday: "long", day: "numeric", month: "long", year: "numeric" });
}

/** Match Calendar's List view — every filtered match, chronological, grouped under a date heading so a long fixture list still reads as "one page per matchday" instead of an undifferentiated scroll. */
export default function CalendarListView({ matches }: { matches: PublicScoreMatch[] }) {
  const byDate = new Map<string, PublicScoreMatch[]>();
  for (const m of matches) {
    const list = byDate.get(m.matchDate) ?? [];
    list.push(m);
    byDate.set(m.matchDate, list);
  }

  return (
    <div className="flex flex-col gap-5">
      {[...byDate.entries()].map(([date, dayMatches]) => (
        <div key={date} className="flex flex-col gap-2">
          <p className="px-1 text-xs font-semibold uppercase tracking-wide text-white/40">{formatDateHeading(date)}</p>
          <div className="flex flex-col gap-2">
            {dayMatches.map((m) => (
              <MatchRow key={m.matchId} match={m} />
            ))}
          </div>
        </div>
      ))}
    </div>
  );
}
