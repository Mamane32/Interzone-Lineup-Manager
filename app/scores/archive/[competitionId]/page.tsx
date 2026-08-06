import Link from "next/link";
import { notFound } from "next/navigation";
import { ChevronLeft, Goal, Trophy } from "lucide-react";
import { getArchivedCompetitionDetail } from "@/lib/public-archive";
import { getPublicScoresFeed } from "@/lib/public-scores";
import StandingsTable from "@/components/scores/StandingsTable";
import TeamCrest from "@/components/scores/TeamCrest";
import NewsCard from "@/components/scores/NewsCard";
import PublicNav from "@/components/scores/PublicNav";

export const dynamic = "force-dynamic";

function formatDate(iso: string): string {
  return new Date(iso).toLocaleDateString("fr-FR", { day: "numeric", month: "short", year: "numeric" });
}

export default async function ArchivedCompetitionPage({ params }: { params: { competitionId: string } }) {
  const competition = await getArchivedCompetitionDetail(params.competitionId);
  if (!competition) notFound();

  const feed = await getPublicScoresFeed();

  return (
    <div className="min-h-screen bg-surface-950 pb-28 text-white">
      <header className="border-b border-white/[0.06] bg-surface-950/90 px-4 py-3 backdrop-blur-xl">
        <div className="mx-auto max-w-2xl">
          <Link href="/scores/archive" className="flex items-center gap-1.5 text-xs font-semibold text-white/50 hover:text-white">
            <ChevronLeft size={14} /> Achiv
          </Link>
        </div>
      </header>

      <main className="mx-auto flex max-w-2xl flex-col gap-6 px-4 pt-5">
        <div className="flex items-center gap-3">
          <TeamCrest name={competition.shortName ?? competition.name} logoUrl={competition.logoUrl} size={52} />
          <div className="flex flex-col gap-0.5">
            <h1 className="font-display text-xl font-black tracking-tight">{competition.name}</h1>
            {competition.seasons.length > 0 && (
              <p className="text-xs text-white/40">{competition.seasons.map((s) => s.year ?? s.name).join(" · ")}</p>
            )}
          </div>
        </div>

        {competition.description && <p className="text-sm leading-6 text-white/55">{competition.description}</p>}

        <div className="grid grid-cols-2 gap-2.5">
          <div className="surface-panel px-4 py-3">
            <p className="text-[10px] font-semibold uppercase tracking-wide text-white/35">Match Jwe</p>
            <p className="mt-1 font-display text-2xl font-black tabular-nums">{competition.totalMatches}</p>
          </div>
          <div className="surface-panel px-4 py-3">
            <p className="text-[10px] font-semibold uppercase tracking-wide text-white/35">Total Gòl</p>
            <p className="mt-1 font-display text-2xl font-black tabular-nums">{competition.totalGoals}</p>
          </div>
        </div>

        {competition.topScorers.length > 0 && (
          <section className="surface-panel overflow-hidden">
            <div className="flex items-center gap-2 border-b border-white/[0.08] px-4 py-3">
              <Goal size={14} className="text-brand-400" />
              <h2 className="font-display text-sm font-bold uppercase tracking-wide text-brand-400">Pi Bon Bombadye</h2>
            </div>
            <div className="divide-y divide-white/[0.06]">
              {competition.topScorers.map((s, i) => (
                <div key={s.playerId} className="flex items-center gap-3 px-4 py-2.5">
                  <span className="w-4 text-xs tabular-nums text-white/30">{i + 1}</span>
                  <div className="flex flex-1 flex-col">
                    <span className="text-sm font-semibold text-white/90">{s.playerName}</span>
                    <span className="text-[11px] text-white/40">{s.teamName}</span>
                  </div>
                  <span className="font-display text-sm font-bold tabular-nums text-brand-400">{s.goals}</span>
                </div>
              ))}
            </div>
          </section>
        )}

        {competition.groups.length > 0 && (
          <section className="flex flex-col gap-3">
            <h2 className="flex items-center gap-2 px-1 font-display text-sm font-bold uppercase tracking-wide">
              <Trophy size={14} className="text-brand-400" /> Klasman Final
            </h2>
            {competition.groups.map((g) => (
              <div key={g.groupId} className="surface-panel overflow-hidden">
                <div className="border-b border-white/[0.08] px-4 py-3">
                  <h3 className="font-display text-sm font-bold uppercase tracking-wide text-brand-400">{g.name}</h3>
                </div>
                <StandingsTable group={g} allGroups={competition.groups} />
              </div>
            ))}
          </section>
        )}

        {competition.results.length > 0 && (
          <section className="flex flex-col gap-2">
            <h2 className="px-1 font-display text-sm font-bold uppercase tracking-wide">Rezilta</h2>
            <div className="surface-panel divide-y divide-white/[0.06] overflow-hidden">
              {competition.results.map((r) => (
                <div key={r.matchId} className="flex items-center gap-3 px-4 py-2.5">
                  <span className="w-16 flex-none text-[10px] font-medium uppercase tracking-wide text-white/30">{formatDate(r.matchDate)}</span>
                  <div className="flex flex-1 items-center justify-between gap-2">
                    <span className="flex flex-1 items-center gap-1.5 truncate text-xs font-medium text-white/80">
                      <TeamCrest name={r.homeTeam.name} logoUrl={r.homeTeam.logoUrl} size={18} /> {r.homeTeam.name}
                    </span>
                    <span className="flex-none font-display text-xs font-bold tabular-nums text-white">
                      {r.homeScore ?? "-"} : {r.awayScore ?? "-"}
                    </span>
                    <span className="flex flex-1 items-center justify-end gap-1.5 truncate text-right text-xs font-medium text-white/80">
                      {r.awayTeam.name} <TeamCrest name={r.awayTeam.name} logoUrl={r.awayTeam.logoUrl} size={18} />
                    </span>
                  </div>
                </div>
              ))}
            </div>
          </section>
        )}

        {competition.news.length > 0 && (
          <section className="flex flex-col gap-2">
            <h2 className="px-1 font-display text-sm font-bold uppercase tracking-wide">Nouvèl</h2>
            <div className="grid grid-cols-1 gap-2.5">
              {competition.news.map((a) => (
                <NewsCard key={a.id} article={a} />
              ))}
            </div>
          </section>
        )}
      </main>

      <PublicNav active="competition" hasLive={feed.live.length > 0} />
    </div>
  );
}
