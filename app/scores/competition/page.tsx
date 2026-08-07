import { ChevronDown, Trophy } from "lucide-react";
import { getPublicGroups, type PublicGroup } from "@/lib/public-groups";
import { getPublicBracket } from "@/lib/public-bracket";
import { getPublicScoresFeed } from "@/lib/public-scores";
import BracketMatchCard from "@/components/scores/BracketMatchCard";
import StandingsTable from "@/components/scores/StandingsTable";
import CompetitionTabs from "@/components/scores/CompetitionTabs";
import PublicNav from "@/components/scores/PublicNav";
import GoodGrafikBreadcrumb from "@/components/scores/GoodGrafikBreadcrumb";
import EmptyState from "@/components/ui/EmptyState";

export const dynamic = "force-dynamic";

type View = "groups" | "bracket";

export default async function CompetitionPage({ searchParams }: { searchParams: { view?: string } }) {
  const [groups, feed, bracket] = await Promise.all([getPublicGroups(), getPublicScoresFeed(), getPublicBracket()]);
  const view: View = searchParams.view === "bracket" ? "bracket" : "groups";

  return (
    <div className="min-h-screen bg-surface-950 pb-28 text-white">
      <header className="border-b border-white/[0.06] bg-surface-950/90 px-5 pb-6 pt-[calc(2rem+env(safe-area-inset-top))] backdrop-blur-xl">
        <div className="mx-auto max-w-2xl text-center">
          <div className="mb-2 flex justify-center">
            <GoodGrafikBreadcrumb />
          </div>
          <p className="eyebrow">Championnat Interzone Du Nord&apos;Ouest</p>
          <h1 className="mt-2 font-display text-2xl font-black tracking-tight">Konpetisyon</h1>
        </div>
      </header>

      <main className="mx-auto flex max-w-2xl flex-col gap-6 px-4 pt-6">
        <CompetitionTabs active={view} />

        {view === "groups" &&
          (groups.length === 0 ? (
            <EmptyState compact icon={Trophy} title="Pa gen gwoup ankò" description="Gwoup yo ap parèt isit la yon fwa yo konfigire." />
          ) : (
            groups.map((g) => <GroupTable key={g.groupId} group={g} allGroups={groups} />)
          ))}

        {view === "bracket" && (
          <div className="flex flex-col items-center gap-2">
            <BracketRound label="1/4 De Finale">
              {bracket.quarterfinals.map((qf) => (
                <BracketMatchCard key={qf.id} match={qf} />
              ))}
            </BracketRound>

            <BracketConnector />

            <BracketRound label="1/2 Finale">
              {bracket.semifinals.map((sf) => (
                <BracketMatchCard key={sf.id} match={sf} />
              ))}
            </BracketRound>

            <BracketConnector />

            <BracketRound label="Grande Finale">
              <BracketMatchCard match={bracket.final} />
            </BracketRound>
          </div>
        )}
      </main>

      <PublicNav active="competition" hasLive={feed.live.length > 0} />
    </div>
  );
}

function GroupTable({ group, allGroups }: { group: PublicGroup; allGroups: PublicGroup[] }) {
  return (
    <div className="surface-panel overflow-hidden">
      <div className="border-b border-white/[0.08] px-4 py-3">
        <h2 className="font-display text-sm font-bold uppercase tracking-wide text-brand-400">{group.name}</h2>
      </div>
      <StandingsTable group={group} allGroups={allGroups} />
    </div>
  );
}

function BracketRound({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <section className="flex w-full flex-col gap-2.5">
      <h2 className="px-1 text-center font-display text-sm font-bold uppercase tracking-wide">{label}</h2>
      <div className="flex flex-col gap-2">{children}</div>
    </section>
  );
}

/** The bracket's only concession to "animated progression" beyond each card's own entrance (BracketMatchCard's animate-fade-up) — a bouncing chevron between rounds, decorative only, not gated by Brand Studio's Motion tokens since it's a static flourish rather than a state transition. */
function BracketConnector() {
  return <ChevronDown size={18} className="animate-bounce text-white/15" aria-hidden="true" />;
}
