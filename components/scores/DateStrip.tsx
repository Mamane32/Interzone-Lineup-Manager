import Link from "next/link";

const WEEKDAY_LABELS = ["Dim", "Len", "Mad", "Mèk", "Jed", "Van", "Sam"];

/** Adds `days` (may be negative) to a "YYYY-MM-DD" date, in UTC so there's no DST edge case to worry about — Haiti has had none since 2015, so treating the calendar date as a UTC instant for pure day arithmetic is safe. */
function offsetDate(iso: string, days: number): string {
  const [y, m, d] = iso.split("-").map(Number);
  const date = new Date(Date.UTC(y, m - 1, d + days));
  return date.toISOString().slice(0, 10);
}

function hrefForDate(searchParams: Record<string, string | undefined>, date: string): string {
  const params = new URLSearchParams();
  for (const [key, value] of Object.entries(searchParams)) {
    if (key === "date" || key === "tab" || value === undefined) continue;
    params.set(key, value);
  }
  params.set("date", date);
  return `/scores?${params.toString()}`;
}

/**
 * GGScoreLive home's Date Selector — a 9-day horizontal strip (3 days back,
 * today, 5 days ahead) for jumping to one exact day's matches, distinct
 * from the Past/Today/Next tabs below it: Past/Today/Next are broad
 * relative buckets (every match ever played, every match still to come),
 * this is "show me exactly this Tuesday." Selecting a date clears the
 * `tab` param (the page treats `date` as taking priority over `tab` when
 * both are present) and scrolls the strip's own row independently of the
 * page, so a long season's worth of days never widens the page itself.
 */
export default function DateStrip({
  today,
  selectedDate,
  searchParams,
}: {
  today: string;
  selectedDate: string | undefined;
  searchParams: Record<string, string | undefined>;
}) {
  const days = Array.from({ length: 9 }, (_, i) => offsetDate(today, i - 3));

  return (
    <div className="-mx-4 flex gap-2 overflow-x-auto px-4 pb-1">
      {days.map((date) => {
        const [y, m, d] = date.split("-").map(Number);
        const weekday = WEEKDAY_LABELS[new Date(Date.UTC(y, m - 1, d)).getUTCDay()];
        const isToday = date === today;
        const isActive = date === selectedDate;
        return (
          <Link
            key={date}
            href={hrefForDate(searchParams, date)}
            aria-current={isActive ? "date" : undefined}
            className={`flex w-12 flex-none flex-col items-center gap-0.5 rounded-xl border py-2 transition ${
              isActive
                ? "border-brand-400/60 bg-brand-400/15 text-brand-400"
                : isToday
                  ? "border-white/[0.15] text-white"
                  : "border-white/[0.08] text-white/50 hover:text-white"
            }`}
          >
            <span className="text-[9px] font-semibold uppercase tracking-wide">{isToday ? "Jodi a" : weekday}</span>
            <span className="font-display text-base font-bold tabular-nums">{d}</span>
          </Link>
        );
      })}
    </div>
  );
}
