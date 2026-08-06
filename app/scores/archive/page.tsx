import Link from "next/link";
import { Archive } from "lucide-react";
import { listArchivedCompetitions } from "@/lib/public-archive";
import { getPublicScoresFeed } from "@/lib/public-scores";
import CompetitionTabs from "@/components/scores/CompetitionTabs";
import TeamCrest from "@/components/scores/TeamCrest";
import PublicNav from "@/components/scores/PublicNav";
import EmptyState from "@/components/ui/EmptyState";

export const dynamic = "force-dynamic";

export default async function ArchivePage() {
  const [competitions, feed] = await Promise.all([listArchivedCompetitions(), getPublicScoresFeed()]);

  return (
    <div className="min-h-screen bg-surface-950 pb-28 text-white">
      <header className="border-b border-white/[0.06] bg-surface-950/90 px-5 pb-6 pt-8 backdrop-blur-xl">
        <div className="mx-auto max-w-2xl text-center">
          <p className="eyebrow">Ansyen Edisyon</p>
          <h1 className="mt-2 font-display text-2xl font-black tracking-tight">Achiv</h1>
        </div>
      </header>

      <main className="mx-auto flex max-w-2xl flex-col gap-6 px-4 pt-6">
        <CompetitionTabs active="archive" />

        {competitions.length === 0 ? (
          <EmptyState compact icon={Archive} title="Pa gen ansyen edisyon" description="Konpetisyon achive yo ap parèt isit la yon fwa yo genyen." />
        ) : (
          <div className="flex flex-col gap-2.5">
            {competitions.map((c) => (
              <Link key={c.id} href={`/scores/archive/${c.id}`} className="surface-panel flex items-center gap-3 px-4 py-3.5 transition hover:border-brand-400/25">
                <TeamCrest name={c.shortName ?? c.name} logoUrl={c.logoUrl} size={40} />
                <div className="flex flex-1 flex-col gap-0.5">
                  <span className="font-display text-sm font-bold text-white">{c.name}</span>
                  <span className="text-xs text-white/40">
                    {c.seasons.length > 0 ? c.seasons.map((s) => s.year ?? s.name).join(" · ") : "Pa gen sezon"}
                  </span>
                </div>
              </Link>
            ))}
          </div>
        )}
      </main>

      <PublicNav active="competition" hasLive={feed.live.length > 0} />
    </div>
  );
}
