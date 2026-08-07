import Link from "next/link";
import { CalendarDays } from "lucide-react";
import { getPublicCalendarMatches, listPublicCompetitions, todayInHaiti, type PublicScoreMatch } from "@/lib/public-scores";
import { getPublicGroups } from "@/lib/public-groups";
import CalendarFilters from "@/components/scores/CalendarFilters";
import CalendarMonthView from "@/components/scores/CalendarMonthView";
import CalendarListView from "@/components/scores/CalendarListView";
import CalendarTimelineView from "@/components/scores/CalendarTimelineView";
import PublicNav from "@/components/scores/PublicNav";
import GoodGrafikBreadcrumb from "@/components/scores/GoodGrafikBreadcrumb";
import EmptyState from "@/components/ui/EmptyState";

export const dynamic = "force-dynamic";

type View = "month" | "list" | "timeline";
const VIEWS: { id: View; label: string }[] = [
  { id: "month", label: "Mwa" },
  { id: "list", label: "Lis" },
  { id: "timeline", label: "Timeline" },
];

export default async function MatchCalendarPage({
  searchParams,
}: {
  searchParams: { view?: string; competition?: string; group?: string; team?: string; month?: string; date?: string };
}) {
  const competitionId = searchParams.competition || undefined;
  const groupId = searchParams.group || undefined;
  const today = todayInHaiti();

  const [matches, competitions, groups] = await Promise.all([
    getPublicCalendarMatches({ competitionId, groupId }),
    listPublicCompetitions(),
    getPublicGroups(),
  ]);

  const groupsForCompetition = competitionId ? groups.filter((g) => g.competitionId === competitionId) : groups;

  const teamNames = [...new Set(matches.flatMap((m) => [m.homeTeam.name, m.awayTeam.name]))].sort();
  const teamFiltered = searchParams.team ? matches.filter((m) => m.homeTeam.name === searchParams.team || m.awayTeam.name === searchParams.team) : matches;

  const view: View = VIEWS.some((v) => v.id === searchParams.view) ? (searchParams.view as View) : "month";
  const month = searchParams.month && /^\d{4}-\d{2}$/.test(searchParams.month) ? searchParams.month : today.slice(0, 7);
  const monthMatches = teamFiltered.filter((m) => m.matchDate.startsWith(month));

  const focusedDate = searchParams.date;
  const focusedMatches: PublicScoreMatch[] | null = focusedDate ? teamFiltered.filter((m) => m.matchDate === focusedDate) : null;

  const hasLive = matches.some((m) => m.isLive);

  return (
    <div className="min-h-screen bg-surface-950 pb-28 text-white">
      <header className="border-b border-white/[0.06] bg-surface-950/90 px-5 pb-5 pt-[calc(1.75rem+env(safe-area-inset-top))] backdrop-blur-xl">
        <div className="mx-auto max-w-2xl text-center">
          <div className="mb-2 flex justify-center">
            <GoodGrafikBreadcrumb />
          </div>
          <p className="eyebrow">GGScoreLive</p>
          <h1 className="mt-1.5 font-display text-2xl font-black tracking-tight">Kalandriye Match</h1>
        </div>
      </header>

      <main className="mx-auto flex max-w-2xl flex-col gap-5 px-4 pt-5">
        <CalendarFilters competitions={competitions} groups={groupsForCompetition} teamNames={teamNames} />

        {!focusedDate && (
          <div className="flex gap-1 rounded-xl border border-white/[0.08] bg-white/[0.03] p-1">
            {VIEWS.map((v) => (
              <Link
                key={v.id}
                href={`/scores/calendar?view=${v.id}${competitionId ? `&competition=${competitionId}` : ""}${groupId ? `&group=${groupId}` : ""}${searchParams.team ? `&team=${searchParams.team}` : ""}`}
                className={`flex-1 rounded-lg py-2 text-center font-display text-xs font-bold uppercase tracking-wide transition ${
                  v.id === view ? "bg-brand-400 text-surface-950" : "text-white/45 hover:text-white/80"
                }`}
              >
                {v.label}
              </Link>
            ))}
          </div>
        )}

        {focusedDate ? (
          <div className="flex flex-col gap-3">
            <div className="flex items-center justify-between px-1">
              <p className="text-xs font-semibold text-white/45">
                {new Date(`${focusedDate}T12:00:00`).toLocaleDateString("fr-FR", { weekday: "long", day: "numeric", month: "long", year: "numeric" })}
              </p>
              <Link href={`/scores/calendar?view=month&month=${focusedDate.slice(0, 7)}${competitionId ? `&competition=${competitionId}` : ""}`} className="text-xs font-semibold text-brand-400">
                Efase dat la
              </Link>
            </div>
            {focusedMatches && focusedMatches.length > 0 ? (
              <CalendarListView matches={focusedMatches} />
            ) : (
              <EmptyState compact icon={CalendarDays} title="Anyen isit la" description="Pa gen match pwograme jou sa a." />
            )}
          </div>
        ) : view === "month" ? (
          <CalendarMonthView month={month} matches={monthMatches} today={today} searchParams={searchParams} />
        ) : teamFiltered.length === 0 ? (
          <EmptyState compact icon={CalendarDays} title="Anyen isit la" description="Pa gen match ki koresponn ak filtè sa yo." />
        ) : view === "list" ? (
          <CalendarListView matches={teamFiltered} />
        ) : (
          <CalendarTimelineView matches={teamFiltered} />
        )}
      </main>

      <PublicNav active="home" hasLive={hasLive} />
    </div>
  );
}
