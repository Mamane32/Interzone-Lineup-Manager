import Link from "next/link";
import { ChevronLeft, ChevronRight } from "lucide-react";
import type { PublicScoreMatch } from "@/lib/public-scores";

const WEEKDAY_LABELS = ["Dim", "Len", "Mad", "Mèk", "Jed", "Van", "Sam"];
const MONTH_LABELS = ["Janvye", "Fevriye", "Mas", "Avril", "Me", "Jen", "Jiyè", "Out", "Septanm", "Oktòb", "Novanm", "Desanm"];

function shiftMonth(month: string, delta: number): string {
  const [y, m] = month.split("-").map(Number);
  const date = new Date(Date.UTC(y, m - 1 + delta, 1));
  return `${date.getUTCFullYear()}-${String(date.getUTCMonth() + 1).padStart(2, "0")}`;
}

/** Rebuilds the current query string with `month`/`date` replaced, keeping every other filter (competition/group/team). */
function hrefFor(searchParams: Record<string, string | undefined>, overrides: Record<string, string | undefined>): string {
  const params = new URLSearchParams();
  for (const [key, value] of Object.entries({ ...searchParams, ...overrides })) {
    if (value === undefined) continue;
    params.set(key, value);
  }
  return `/scores/calendar?${params.toString()}`;
}

/**
 * Match Calendar's Month view — a standard 6-week grid (leading/trailing
 * days from neighboring months included, dimmed, so every week row is
 * always full). Each day cell shows a live-red or upcoming-brand dot per
 * match (max 3, "+N" beyond that) and links into the List view focused on
 * that one date, reusing the same `date` param GGScoreLive home's Date
 * Selector already established.
 */
export default function CalendarMonthView({
  month,
  matches,
  today,
  searchParams,
}: {
  month: string;
  matches: PublicScoreMatch[];
  today: string;
  searchParams: Record<string, string | undefined>;
}) {
  const [y, m] = month.split("-").map(Number);
  const firstOfMonth = new Date(Date.UTC(y, m - 1, 1));
  const gridStart = new Date(firstOfMonth);
  gridStart.setUTCDate(gridStart.getUTCDate() - firstOfMonth.getUTCDay());

  const matchesByDate = new Map<string, PublicScoreMatch[]>();
  for (const match of matches) {
    const list = matchesByDate.get(match.matchDate) ?? [];
    list.push(match);
    matchesByDate.set(match.matchDate, list);
  }

  const cells = Array.from({ length: 42 }, (_, i) => {
    const d = new Date(gridStart);
    d.setUTCDate(gridStart.getUTCDate() + i);
    const iso = d.toISOString().slice(0, 10);
    return { iso, day: d.getUTCDate(), inMonth: d.getUTCMonth() === m - 1, matches: matchesByDate.get(iso) ?? [] };
  });

  return (
    <div className="flex flex-col gap-3">
      <div className="flex items-center justify-between px-1">
        <Link href={hrefFor(searchParams, { month: shiftMonth(month, -1) })} aria-label="Previous month" className="rounded-lg border border-white/[0.08] p-1.5 text-white/50 hover:text-white">
          <ChevronLeft size={15} />
        </Link>
        <p className="font-display text-sm font-bold uppercase tracking-wide text-white">
          {MONTH_LABELS[m - 1]} {y}
        </p>
        <Link href={hrefFor(searchParams, { month: shiftMonth(month, 1) })} aria-label="Next month" className="rounded-lg border border-white/[0.08] p-1.5 text-white/50 hover:text-white">
          <ChevronRight size={15} />
        </Link>
      </div>

      <div className="grid grid-cols-7 gap-1 text-center text-[9px] font-semibold uppercase tracking-wide text-white/30">
        {WEEKDAY_LABELS.map((w) => (
          <span key={w}>{w}</span>
        ))}
      </div>

      <div className="grid grid-cols-7 gap-1">
        {cells.map((cell) => {
          const hasLive = cell.matches.some((m) => m.isLive);
          return (
            <Link
              key={cell.iso}
              href={hrefFor(searchParams, { date: cell.iso, month: undefined })}
              className={`flex aspect-square flex-col items-center justify-center gap-1 rounded-lg border text-xs transition ${
                cell.iso === today ? "border-brand-400/50 bg-brand-400/10" : "border-white/[0.06] hover:border-white/20"
              } ${cell.inMonth ? "text-white/80" : "text-white/20"}`}
            >
              <span className="tabular-nums">{cell.day}</span>
              {cell.matches.length > 0 && (
                <span className={`h-1.5 w-1.5 rounded-full ${hasLive ? "animate-pulse bg-red-400" : "bg-brand-400/70"}`} aria-hidden="true" />
              )}
            </Link>
          );
        })}
      </div>
    </div>
  );
}
