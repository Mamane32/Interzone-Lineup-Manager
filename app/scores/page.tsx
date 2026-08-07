import { CalendarDays, Radio, Tv } from "lucide-react";
import { getPublicScoresFeed, getPublicMatchesForDate, listPublicCompetitions, todayInHaiti, type PublicScoreMatch } from "@/lib/public-scores";
import { getPlatformBranding } from "@/lib/branding";
import MatchRow from "@/components/scores/MatchRow";
import LiveNowCard from "@/components/scores/LiveNowCard";
import ScoresHero from "@/components/scores/ScoresHero";
import CompetitionSelector from "@/components/scores/CompetitionSelector";
import DateStrip from "@/components/scores/DateStrip";
import ScoresSearch from "@/components/scores/ScoresSearch";
import PublicNav from "@/components/scores/PublicNav";
import GoodGrafikBreadcrumb from "@/components/scores/GoodGrafikBreadcrumb";
import EmptyState from "@/components/ui/EmptyState";
import Link from "next/link";

export const dynamic = "force-dynamic";

type Tab = "past" | "today" | "next";
const TAB_LABEL: Record<Tab, string> = { past: "Past", today: "Today", next: "Next" };
const TABS: Tab[] = ["past", "today", "next"];

const EMPTY_COPY: Record<Tab, string> = {
  past: "Pa gen match ki jwe ankò.",
  today: "Pa gen match pwograme jodi a.",
  next: "Pa gen match pwograme pou pita.",
};

export default async function GGScoreLivePage({
  searchParams,
}: {
  searchParams: { tab?: string; competition?: string; date?: string };
}) {
  const competitionId = searchParams.competition || undefined;
  const [feed, competitions, platform] = await Promise.all([
    getPublicScoresFeed(competitionId),
    listPublicCompetitions(),
    getPlatformBranding(),
  ]);

  const today = todayInHaiti();
  const selectedDate = searchParams.date;
  const dateMatches = selectedDate ? await getPublicMatchesForDate(selectedDate, competitionId) : null;

  const activeTab: Tab = TABS.includes(searchParams.tab as Tab) ? (searchParams.tab as Tab) : "today";
  const lists: Record<Tab, PublicScoreMatch[]> = { past: feed.past, today: feed.today, next: feed.next };
  const activeList = dateMatches ?? lists[activeTab];

  const activeCompetition = competitions.find((c) => c.id === competitionId) ?? (competitions.length === 1 ? competitions[0] : null);
  const allMatches = [...feed.live, ...feed.today, ...feed.past, ...feed.next];
  const teamNames = new Set<string>();
  for (const m of allMatches) {
    teamNames.add(m.homeTeam.name);
    teamNames.add(m.awayTeam.name);
  }

  return (
    <div className="min-h-screen bg-surface-950 pb-28 text-white">
      <header className="border-b border-white/[0.06] bg-surface-950/90 px-4 pb-4 pt-[calc(1.5rem+env(safe-area-inset-top))] backdrop-blur-xl">
        <div className="mx-auto max-w-2xl">
          <div className="mb-2">
            <GoodGrafikBreadcrumb />
          </div>
          <div className="flex items-center justify-between gap-3">
            <h1 className="font-display text-lg font-black tracking-tight text-brand-400">GGScoreLive</h1>
            <ScoresSearch competitionId={competitionId} />
          </div>
        </div>
      </header>

      <main className="mx-auto flex max-w-2xl flex-col gap-6 px-4 pt-5">
        <ScoresHero
          organizationName={platform.organizationName}
          competitionName={activeCompetition?.name ?? null}
          liveCount={feed.live.length}
          teamCount={teamNames.size}
          nextMatch={feed.next[0] ?? null}
        />

        <CompetitionSelector competitions={competitions} activeCompetitionId={competitionId} searchParams={searchParams} />

        {feed.live.length > 0 && (
          <section id="live-now" className="flex flex-col gap-3">
            <div className="flex items-center gap-2 px-1">
              <Radio size={14} className="text-red-400" />
              <h2 className="font-display text-sm font-bold uppercase tracking-wide">Live Now</h2>
            </div>
            <div className="-mx-4 flex gap-3 overflow-x-auto px-4 pb-1">
              {feed.live.map((m) => (
                <LiveNowCard key={m.matchId} match={m} />
              ))}
            </div>
          </section>
        )}

        <section className="flex flex-col gap-3">
          <div className="flex items-center justify-between px-1">
            <h2 className="font-display text-sm font-bold uppercase tracking-wide">Match</h2>
            <div className="flex items-center gap-3">
              <Link href="/scores/streaming" className="flex items-center gap-1.5 text-xs font-semibold text-brand-400">
                <Tv size={13} /> Streaming
              </Link>
              <Link href="/scores/calendar" className="flex items-center gap-1.5 text-xs font-semibold text-brand-400">
                <CalendarDays size={13} /> Tout kalandriye a
              </Link>
            </div>
          </div>
          <DateStrip today={today} selectedDate={selectedDate} searchParams={searchParams} />

          {!selectedDate && (
            <div className="flex gap-1 rounded-xl border border-white/[0.08] bg-white/[0.03] p-1">
              {TABS.map((tab) => (
                <Link
                  key={tab}
                  href={`/scores?tab=${tab}${competitionId ? `&competition=${competitionId}` : ""}`}
                  className={`flex-1 rounded-lg py-2 text-center font-display text-xs font-bold uppercase tracking-wide transition ${
                    tab === activeTab ? "bg-brand-400 text-surface-950" : "text-white/45 hover:text-white/80"
                  }`}
                >
                  {TAB_LABEL[tab]}
                </Link>
              ))}
            </div>
          )}
          {selectedDate && (
            <div className="flex items-center justify-between px-1">
              <p className="text-xs font-semibold text-white/45">
                Match {new Date(`${selectedDate}T12:00:00`).toLocaleDateString("fr-FR", { weekday: "long", day: "numeric", month: "long" })}
              </p>
              <Link href={competitionId ? `/scores?competition=${competitionId}` : "/scores"} className="text-xs font-semibold text-brand-400">
                Efase dat la
              </Link>
            </div>
          )}

          {activeList.length === 0 ? (
            <EmptyState compact icon={CalendarDays} title="Anyen isit la" description={selectedDate ? "Pa gen match pwograme jou sa a." : EMPTY_COPY[activeTab]} />
          ) : (
            <div className="flex flex-col gap-2">
              {activeList.map((m) => (
                <MatchRow key={m.matchId} match={m} />
              ))}
            </div>
          )}
        </section>
      </main>

      <PublicNav active="home" hasLive={feed.live.length > 0} />
    </div>
  );
}
