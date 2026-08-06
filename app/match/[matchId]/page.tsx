import Image from "next/image";
import Link from "next/link";
import { notFound } from "next/navigation";
import { MapPin, ShieldCheck, Radio, Trophy, CalendarDays } from "lucide-react";
import { getPublicMatchView, type PublicMatchEvent, type PublicMatchStatistics, type PublicMatchTeam } from "@/lib/public-match";
import { getPublicScoresFeed, getPublicRelatedMatches } from "@/lib/public-scores";
import { getPublicGroups, type PublicGroup } from "@/lib/public-groups";
import { getBaseBranding, withCompetition } from "@/lib/branding";
import { formatMatchDate } from "@/lib/utils";
import { EVENT_META } from "@/lib/event-meta";
import BrandBar from "@/components/live/BrandBar";
import PublicNav from "@/components/scores/PublicNav";
import MatchRow from "@/components/scores/MatchRow";
import TeamCrest from "@/components/scores/TeamCrest";
import StandingsTable from "@/components/scores/StandingsTable";
import PublicLineups from "@/components/scores/PublicLineups";
import { getTheme } from "@/lib/team-theme";

export const dynamic = "force-dynamic";

const STATUS_LABEL: Record<string, string> = {
  pre_match: "Upcoming",
  kickoff: "Kick Off",
  first_half: "First Half",
  half_time: "Half-time",
  second_half: "Second Half",
  extra_time: "Extra Time",
  penalty_shootout: "Penalties",
  full_time: "Full-time",
};

const COUNTER_LABELS: { key: keyof PublicMatchStatistics; label: string; suffix?: string }[] = [
  { key: "possessionPercent", label: "Possession", suffix: "%" },
  { key: "shots", label: "Shots" },
  { key: "shotsOnTarget", label: "Shots on Target" },
  { key: "corners", label: "Corners" },
  { key: "fouls", label: "Fouls" },
  { key: "offside", label: "Offside" },
  { key: "yellowCards", label: "Yellow Cards" },
  { key: "redCards", label: "Red Cards" },
  { key: "saves", label: "Saves" },
];

/**
 * Public Match Center — no authentication, reachable by anyone with the
 * link. Renders entirely from lib/public-match.ts's getPublicMatchView(),
 * which has already decided what's safe to show an anonymous visitor;
 * this page never reads a private table directly and never imports a
 * private/interactive component (StatisticsPanel, MatchTimelineEvent) —
 * both accept full Team/MatchEvent objects that carry fields (coach
 * phone/email, the Coach Portal token) that must never reach a public
 * page's client-serialized props, so this page builds its own minimal
 * read-only presentation instead. EVENT_META (icons/labels only, no
 * private data) is safe to reuse as-is.
 */
export default async function PublicMatchPage({ params }: { params: { matchId: string } }) {
  const [view, feed, groups] = await Promise.all([getPublicMatchView(params.matchId), getPublicScoresFeed(), getPublicGroups()]);
  if (!view) notFound();

  const group = view.groupId ? groups.find((g) => g.groupId === view.groupId) ?? null : null;
  const relatedMatches = view.groupId ? await getPublicRelatedMatches(view.groupId, view.matchId) : [];

  const branding = withCompetition(getBaseBranding(), {
    name: view.competitionName,
    logo_url: view.competitionLogoUrl,
    organization: { name: view.organizationName, logo_url: view.organizationLogoUrl },
  });

  const homeTheme = getTheme(view.homeTeam.name);
  const awayTheme = getTheme(view.awayTeam.name);
  const isLive = view.phase === "live";

  return (
    <div className="min-h-screen bg-surface-950 pb-28 text-white">
      <header className="border-b border-white/10 px-4 py-3">
        <div className="mx-auto max-w-3xl">
          <BrandBar branding={branding} compact />
        </div>
      </header>

      <main className="mx-auto flex max-w-3xl flex-col gap-4 px-4 py-6">
        <div className="surface-panel pitch-texture p-6">
          <div className="mb-5 flex flex-wrap items-center justify-center gap-2 text-center">
            {isLive && (
              <span className="flex items-center gap-1.5 rounded-full bg-red-500 px-2.5 py-0.5 text-[10px] font-bold uppercase tracking-wide text-white">
                <Radio size={10} className="animate-pulse" /> Live
              </span>
            )}
            <span className="rounded-full bg-white/8 px-2.5 py-0.5 text-[10px] font-semibold uppercase tracking-wide text-white/50">
              {STATUS_LABEL[view.liveStatus] ?? view.liveStatus}
            </span>
          </div>

          <div className="grid grid-cols-[1fr_auto_1fr] items-center gap-2">
            <TeamColumn team={view.homeTeam} />
            <div className="flex flex-col items-center gap-1">
              {view.phase === "upcoming" ? (
                <p className="font-display text-2xl font-black text-white/40">VS</p>
              ) : (
                <p className="whitespace-nowrap font-display text-4xl font-black tabular-nums leading-none tracking-tight sm:text-6xl">
                  {view.homeScore} <span className="text-white/15">–</span> {view.awayScore}
                </p>
              )}
              {view.phase !== "upcoming" && (
                <div className="mt-3 flex items-baseline gap-1.5 rounded-full bg-white/5 px-3 py-1">
                  <span className="font-display text-lg font-bold tabular-nums text-white/80">{view.minuteLabel}</span>
                  {view.additionalTimeLabel && <span className="font-display text-xs font-semibold text-amber-signal">{view.additionalTimeLabel}</span>}
                </div>
              )}
            </div>
            <TeamColumn team={view.awayTeam} align="right" />
          </div>

          <p className="mt-5 text-center text-xs text-white/40">{formatMatchDate(view.matchDate, view.matchTime)}</p>
        </div>

        <div className="surface-panel flex flex-wrap items-center justify-center gap-x-5 gap-y-2 p-4 text-xs text-white/50">
          {view.competitionName && (
            <span>
              {view.competitionName}
              {view.round ? ` · ${view.round}` : ""}
            </span>
          )}
          {view.venueName && (
            <span className="flex items-center gap-1.5">
              <MapPin size={12} /> {view.venueName}
              {view.venueCity ? `, ${view.venueCity}` : ""}
            </span>
          )}
          {view.refereeName && (
            <span className="flex items-center gap-1.5">
              <ShieldCheck size={12} /> {view.refereeName}
            </span>
          )}
        </div>

        {view.phase !== "upcoming" && (
          <>
            <PublicTimeline events={view.events} />
            {view.homeStatistics && view.awayStatistics && (
              <PublicStatistics homeName={view.homeTeam.name} awayName={view.awayTeam.name} homeStats={view.homeStatistics} awayStats={view.awayStatistics} homeTheme={homeTheme.solid} awayTheme={awayTheme.solid} />
            )}
          </>
        )}

        {view.phase === "upcoming" && (
          <div className="surface-panel p-6 text-center text-sm text-white/50">Kicks off {formatMatchDate(view.matchDate, view.matchTime)}.</div>
        )}

        <PublicLineups homeTeamName={view.homeTeam.name} awayTeamName={view.awayTeam.name} homeLineup={view.homeLineup} awayLineup={view.awayLineup} />

        {group && <PublicStandingsCard group={group} allGroups={groups} homeName={view.homeTeam.name} awayName={view.awayTeam.name} />}

        {relatedMatches.length > 0 && (
          <div className="flex flex-col gap-2">
            <h2 className="flex items-center gap-1.5 px-1 text-xs font-semibold uppercase tracking-wide text-white/40">
              <CalendarDays size={13} /> Lòt Match Nan {group?.name ?? "Menm Gwoup"}
            </h2>
            <div className="flex flex-col gap-2">
              {relatedMatches.map((m) => (
                <MatchRow key={m.matchId} match={m} />
              ))}
            </div>
          </div>
        )}
      </main>

      <PublicNav active="home" hasLive={feed.live.length > 0} />
    </div>
  );
}

function TeamColumn({ team, align = "left" }: { team: PublicMatchTeam; align?: "left" | "right" }) {
  return (
    <div className={`flex flex-col items-center gap-2 text-center ${align === "right" ? "" : ""}`}>
      {team.logoUrl ? (
        <Image src={team.logoUrl} alt="" width={56} height={56} className="h-14 w-14 rounded-full bg-white/10 object-cover ring-1 ring-white/15" unoptimized />
      ) : (
        <div className="flex h-14 w-14 items-center justify-center rounded-full bg-white/10 font-display text-sm ring-1 ring-white/15">
          {team.name.slice(0, 2).toUpperCase()}
        </div>
      )}
      <span className="max-w-[7rem] truncate text-xs font-semibold text-white/90">{team.name}</span>
    </div>
  );
}

function PublicTimeline({ events }: { events: PublicMatchEvent[] }) {
  return (
    <div className="surface-panel p-4">
      <h2 className="mb-3 text-xs font-semibold uppercase tracking-wide text-white/40">Match Timeline</h2>
      {events.length === 0 ? (
        <p className="text-xs text-white/30">No events yet.</p>
      ) : (
        <div className="flex flex-col gap-1.5">
          {events.map((e, i) => {
            const meta = EVENT_META[e.type];
            return (
              <div key={i} className="flex items-center gap-2.5 rounded-xl bg-white/[0.03] py-2 pl-2.5 pr-2">
                <span className="w-9 flex-none text-center font-display text-xs font-bold text-white/50">{e.minute}&apos;</span>
                <span className={`flex h-6 w-6 flex-none items-center justify-center rounded-full ${meta.tone}`}>
                  <meta.icon size={12} />
                </span>
                <div className="min-w-0 flex-1">
                  <p className="truncate text-xs font-semibold text-white/90">
                    {meta.label}
                    {e.teamName ? ` · ${e.teamName}` : ""}
                  </p>
                  {(e.playerName || e.description) && (
                    <p className="truncate text-[11px] text-white/40">
                      {e.playerName ?? ""}
                      {e.playerName && e.description ? " — " : ""}
                      {e.description ?? ""}
                    </p>
                  )}
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}

function PublicStatistics({
  homeName,
  awayName,
  homeStats,
  awayStats,
  homeTheme,
  awayTheme,
}: {
  homeName: string;
  awayName: string;
  homeStats: PublicMatchStatistics;
  awayStats: PublicMatchStatistics;
  homeTheme: string;
  awayTheme: string;
}) {
  return (
    <div className="surface-panel p-4">
      <h2 className="mb-3 text-xs font-semibold uppercase tracking-wide text-white/40">Match Statistics</h2>
      <div className="mb-3 flex items-center justify-between text-[10px] font-semibold uppercase tracking-wide text-white/30">
        <span>{homeName.slice(0, 3).toUpperCase()}</span>
        <span>{awayName.slice(0, 3).toUpperCase()}</span>
      </div>
      <div className="flex flex-col gap-3">
        {COUNTER_LABELS.map(({ key, label, suffix }) => {
          const home = homeStats[key] ?? 0;
          const away = awayStats[key] ?? 0;
          const total = (home as number) + (away as number) || 1;
          const homePct = ((home as number) / total) * 100;
          return (
            <div key={key}>
              <div className="mb-1 flex items-center justify-between text-xs">
                <span className="w-10 font-semibold text-white/80">
                  {home}
                  {suffix ?? ""}
                </span>
                <span className="text-white/40">{label}</span>
                <span className="w-10 text-right font-semibold text-white/80">
                  {away}
                  {suffix ?? ""}
                </span>
              </div>
              <div className="flex h-1.5 overflow-hidden rounded-full bg-white/5">
                <div className={homeTheme} style={{ width: `${homePct}%` }} />
                <div className={`flex-1 ${awayTheme}`} />
              </div>
            </div>
          );
        })}
        <div className="flex items-center justify-between border-t border-white/10 pt-3 text-xs">
          <span className="w-10 font-semibold text-white/30">{homeStats.expectedGoals ?? "—"}</span>
          <span className="text-white/30">Expected Goals (xG)</span>
          <span className="w-10 text-right font-semibold text-white/30">{awayStats.expectedGoals ?? "—"}</span>
        </div>
      </div>
    </div>
  );
}

function PublicStandingsCard({ group, allGroups, homeName, awayName }: { group: PublicGroup; allGroups: PublicGroup[]; homeName: string; awayName: string }) {
  return (
    <div className="surface-panel overflow-hidden">
      <div className="flex items-center gap-2 border-b border-white/[0.08] px-4 py-3">
        <Trophy size={14} className="text-brand-400" />
        <h2 className="font-display text-sm font-bold uppercase tracking-wide text-brand-400">{group.name}</h2>
      </div>
      <StandingsTable group={group} allGroups={allGroups} highlightTeamNames={[homeName, awayName]} />
    </div>
  );
}
