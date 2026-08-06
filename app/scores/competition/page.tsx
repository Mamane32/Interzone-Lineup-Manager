import Link from "next/link";
import { getPublicGroups, type PublicGroup } from "@/lib/public-groups";
import { resolveQuarterfinals, type ResolvedSlot } from "@/lib/bracket";
import { getPublicScoresFeed } from "@/lib/public-scores";
import BracketSlot from "@/components/scores/BracketSlot";
import StandingsTable from "@/components/scores/StandingsTable";
import PublicNav from "@/components/scores/PublicNav";
import EmptyState from "@/components/ui/EmptyState";
import { Trophy } from "lucide-react";

export const dynamic = "force-dynamic";

type View = "groups" | "bracket";

export default async function CompetitionPage({ searchParams }: { searchParams: { view?: string } }) {
  const [groups, feed] = await Promise.all([getPublicGroups(), getPublicScoresFeed()]);
  const view: View = searchParams.view === "bracket" ? "bracket" : "groups";
  const quarterfinals = resolveQuarterfinals(groups);

  return (
    <div className="min-h-screen bg-surface-950 pb-28 text-white">
      <header className="border-b border-white/[0.06] bg-surface-950/90 px-5 pb-6 pt-8 backdrop-blur-xl">
        <div className="mx-auto max-w-2xl text-center">
          <p className="eyebrow">Championnat Interzone Du Nord&apos;Ouest</p>
          <h1 className="mt-2 font-display text-2xl font-black tracking-tight">Konpetisyon</h1>
        </div>
      </header>

      <main className="mx-auto flex max-w-2xl flex-col gap-6 px-4 pt-6">
        <div className="flex gap-1 rounded-xl border border-white/[0.08] bg-white/[0.03] p-1">
          <Link
            href="/scores/competition?view=groups"
            className={`flex-1 rounded-lg py-2 text-center font-display text-xs font-bold uppercase tracking-wide transition ${
              view === "groups" ? "bg-brand-400 text-surface-950" : "text-white/45 hover:text-white/80"
            }`}
          >
            Klasman
          </Link>
          <Link
            href="/scores/competition?view=bracket"
            className={`flex-1 rounded-lg py-2 text-center font-display text-xs font-bold uppercase tracking-wide transition ${
              view === "bracket" ? "bg-brand-400 text-surface-950" : "text-white/45 hover:text-white/80"
            }`}
          >
            Bracket
          </Link>
        </div>

        {view === "groups" &&
          (groups.length === 0 ? (
            <EmptyState compact icon={Trophy} title="Pa gen gwoup ankò" description="Gwoup yo ap parèt isit la yon fwa yo konfigire." />
          ) : (
            groups.map((g) => <GroupTable key={g.groupId} group={g} allGroups={groups} />)
          ))}

        {view === "bracket" && (
          <div className="flex flex-col gap-5">
            <BracketRound label="1/4 De Finale" dateHint="27 – 30 Out 2026">
              {quarterfinals.map((qf) => (
                <BracketMatchCard key={qf.id} homeSlot={qf.home} awaySlot={qf.away} />
              ))}
            </BracketRound>

            <BracketRound label="1/2 Finale" dateHint="1 – 2 Sept 2026">
              <BracketMatchCard homeSlot={{ resolved: false, label: "Vènkè QF1" }} awaySlot={{ resolved: false, label: "Vènkè QF2" }} />
              <BracketMatchCard homeSlot={{ resolved: false, label: "Vènkè QF3" }} awaySlot={{ resolved: false, label: "Vènkè QF4" }} />
            </BracketRound>

            <BracketRound label="Grande Finale" dateHint="6 Sept 2026">
              <BracketMatchCard homeSlot={{ resolved: false, label: "Vènkè 1/2 Final 1" }} awaySlot={{ resolved: false, label: "Vènkè 1/2 Final 2" }} />
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

function BracketRound({ label, dateHint, children }: { label: string; dateHint: string; children: React.ReactNode }) {
  return (
    <section className="flex flex-col gap-2.5">
      <div className="flex items-baseline justify-between px-1">
        <h2 className="font-display text-sm font-bold uppercase tracking-wide">{label}</h2>
        <span className="text-[11px] text-white/35">{dateHint}</span>
      </div>
      <div className="flex flex-col gap-2">{children}</div>
    </section>
  );
}

function BracketMatchCard({ homeSlot, awaySlot }: { homeSlot: ResolvedSlot; awaySlot: ResolvedSlot }) {
  return (
    <div className="surface-panel flex flex-col gap-2 px-4 py-3">
      <BracketSlot slot={homeSlot} />
      <div className="h-px bg-white/[0.06]" />
      <BracketSlot slot={awaySlot} />
    </div>
  );
}
