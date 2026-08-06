import Link from "next/link";
import { CalendarDays, Home, Newspaper, Radio, Trophy, User } from "lucide-react";
import { getPublicScoresFeed, type PublicScoreMatch } from "@/lib/public-scores";
import MatchRow from "@/components/scores/MatchRow";
import LiveNowCard from "@/components/scores/LiveNowCard";
import EmptyState from "@/components/ui/EmptyState";

export const dynamic = "force-dynamic";

type Tab = "past" | "today" | "next";
const TAB_LABEL: Record<Tab, string> = { past: "Past", today: "Today", next: "Next" };
const TABS: Tab[] = ["past", "today", "next"];

const EMPTY_COPY: Record<Tab, string> = {
  past: "Pa gen match ki jwe ankò.",
  today: "Pa gen match pwograme jodi a.",
  next: "Pa gen match pwograme pou pita.",
};

export default async function GGScoreLivePage({ searchParams }: { searchParams: { tab?: string } }) {
  const feed = await getPublicScoresFeed();
  const activeTab: Tab = TABS.includes(searchParams.tab as Tab) ? (searchParams.tab as Tab) : "today";
  const lists: Record<Tab, PublicScoreMatch[]> = { past: feed.past, today: feed.today, next: feed.next };
  const activeList = lists[activeTab];

  return (
    <div className="min-h-screen bg-surface-950 pb-28 text-white">
      <header className="border-b border-white/[0.06] bg-surface-950/90 px-5 pb-6 pt-8 backdrop-blur-xl">
        <div className="mx-auto max-w-2xl text-center">
          <p className="eyebrow">Championnat Interzone Du Nord&apos;Ouest</p>
          <h1 className="mt-2 font-display text-3xl font-black tracking-tight text-brand-400">GGScoreLive</h1>
        </div>
      </header>

      <main className="mx-auto flex max-w-2xl flex-col gap-8 px-4 pt-6">
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
          <div className="flex gap-1 rounded-xl border border-white/[0.08] bg-white/[0.03] p-1">
            {TABS.map((tab) => (
              <Link
                key={tab}
                href={`/scores?tab=${tab}`}
                className={`flex-1 rounded-lg py-2 text-center font-display text-xs font-bold uppercase tracking-wide transition ${
                  tab === activeTab ? "bg-brand-400 text-surface-950" : "text-white/45 hover:text-white/80"
                }`}
              >
                {TAB_LABEL[tab]}
              </Link>
            ))}
          </div>

          {activeList.length === 0 ? (
            <EmptyState compact icon={CalendarDays} title="Anyen isit la" description={EMPTY_COPY[activeTab]} />
          ) : (
            <div className="flex flex-col gap-2">
              {activeList.map((m) => (
                <MatchRow key={m.matchId} match={m} />
              ))}
            </div>
          )}
        </section>
      </main>

      <nav className="fixed inset-x-0 bottom-0 z-40 border-t border-white/[0.08] bg-surface-950/95 backdrop-blur-xl">
        <div className="relative mx-auto flex max-w-2xl items-center justify-between px-6 py-2.5">
          <NavItem icon={Home} label="Home" active />
          <NavItem icon={Trophy} label="Competition" soon />

          <Link
            href={feed.live.length > 0 ? "#live-now" : "#"}
            aria-disabled={feed.live.length === 0}
            className={`-mt-7 flex h-14 w-14 flex-none flex-col items-center justify-center gap-0.5 rounded-full border-4 border-surface-950 font-display text-[9px] font-bold uppercase tracking-wide shadow-lg transition ${
              feed.live.length > 0 ? "bg-brand-400 text-surface-950" : "pointer-events-none bg-white/10 text-white/30"
            }`}
          >
            <Radio size={16} />
            Live
          </Link>

          <NavItem icon={Newspaper} label="News" soon />
          <NavItem icon={User} label="Account" soon />
        </div>
      </nav>
    </div>
  );
}

function NavItem({
  icon: Icon,
  label,
  active = false,
  soon = false,
}: {
  icon: typeof Home;
  label: string;
  active?: boolean;
  soon?: boolean;
}) {
  return (
    <div className={`flex flex-col items-center gap-1 px-2 py-1 ${soon ? "opacity-40" : ""}`}>
      <Icon size={20} className={active ? "text-brand-400" : "text-white/50"} />
      <span className={`text-[10px] font-semibold ${active ? "text-brand-400" : "text-white/50"}`}>{label}</span>
      {soon && <span className="text-[7px] font-bold uppercase tracking-wide text-white/25">Byento</span>}
    </div>
  );
}
