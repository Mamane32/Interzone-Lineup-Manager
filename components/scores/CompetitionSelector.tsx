import Link from "next/link";
import type { PublicCompetitionOption } from "@/lib/public-scores";

/** Rebuilds the current query string with `competition` set (or removed for "All"), keeping every other param (tab, date, q) — plain server-rendered links, no client JS needed for something this simple. */
function hrefWithCompetition(searchParams: Record<string, string | undefined>, competitionId: string | null): string {
  const params = new URLSearchParams();
  for (const [key, value] of Object.entries(searchParams)) {
    if (key === "competition" || value === undefined) continue;
    params.set(key, value);
  }
  if (competitionId) params.set("competition", competitionId);
  const qs = params.toString();
  return qs ? `/scores?${qs}` : "/scores";
}

/**
 * GGScoreLive home's Competition Selector — a horizontally scrollable pill
 * row, same visual language as the Past/Today/Next tabs. Renders nothing
 * when there's only zero or one active competition (an "All" vs. a single
 * option is a distinction without a difference), so today's single-
 * competition platform shows an unchanged, uncluttered home page — the
 * selector activates itself automatically the moment a second competition
 * goes live, no code change needed.
 */
export default function CompetitionSelector({
  competitions,
  activeCompetitionId,
  searchParams,
}: {
  competitions: PublicCompetitionOption[];
  activeCompetitionId: string | undefined;
  searchParams: Record<string, string | undefined>;
}) {
  if (competitions.length < 2) return null;

  return (
    <div className="-mx-4 flex gap-1.5 overflow-x-auto px-4 pb-1">
      <Link
        href={hrefWithCompetition(searchParams, null)}
        className={`flex-none rounded-full border px-3.5 py-1.5 text-xs font-semibold transition ${
          !activeCompetitionId ? "border-brand-400/60 bg-brand-400/15 text-brand-400" : "border-white/[0.08] text-white/50 hover:text-white"
        }`}
      >
        All Competitions
      </Link>
      {competitions.map((c) => (
        <Link
          key={c.id}
          href={hrefWithCompetition(searchParams, c.id)}
          className={`flex-none whitespace-nowrap rounded-full border px-3.5 py-1.5 text-xs font-semibold transition ${
            activeCompetitionId === c.id ? "border-brand-400/60 bg-brand-400/15 text-brand-400" : "border-white/[0.08] text-white/50 hover:text-white"
          }`}
        >
          {c.name}
        </Link>
      ))}
    </div>
  );
}
