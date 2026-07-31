import { notFound } from "next/navigation";
import Link from "next/link";
import Image from "next/image";
import { Trophy, CalendarDays, Clock, MapPin } from "lucide-react";
import { supabaseAdmin } from "@/lib/supabase-admin";
import Button from "@/components/ui/Button";
import { formatMatchDate } from "@/lib/utils";
import { getTheme } from "@/lib/team-theme";
import type { Team } from "@/lib/types";

// Always render on request — this page reads live data via the service-role
// Supabase client, and must never be executed or cached at build time.
export const dynamic = "force-dynamic";

/**
 * Public premium landing page — the first thing a coach sees when opening
 * their private link. No authentication required here; this only shows
 * information that was already public in the old single-page flow (team
 * names, logos, match schedule). The LOGIN button is the gate into
 * everything else.
 */
export default async function CoachLandingPage({ params }: { params: { token: string } }) {
  const supabase = supabaseAdmin();

  const { data: team } = await supabase.from("teams").select("*").eq("token", params.token).single();
  if (!team) notFound();

  const { data: lineups } = await supabase
    .from("lineups")
    .select(
      "*, match:matches(*, competition:competitions(*), home_team:teams!matches_home_team_id_fkey(*), away_team:teams!matches_away_team_id_fkey(*))"
    )
    .eq("team_id", team.id);

  const list = (lineups ?? []) as any[];
  const now = Date.now();
  const upcoming = list
    .filter((l) => l.match && new Date(`${l.match.match_date}T${l.match.match_time}`).getTime() >= now)
    .sort(
      (a, b) =>
        new Date(`${a.match.match_date}T${a.match.match_time}`).getTime() -
        new Date(`${b.match.match_date}T${b.match.match_time}`).getTime()
    );
  const mostRecentPast = list
    .filter((l) => l.match)
    .sort(
      (a, b) =>
        new Date(`${b.match.match_date}T${b.match.match_time}`).getTime() -
        new Date(`${a.match.match_date}T${a.match.match_time}`).getTime()
    );
  const featured = upcoming[0] ?? mostRecentPast[0];
  const opponent = featured?.match
    ? featured.match.home_team_id === team.id
      ? featured.match.away_team
      : featured.match.home_team
    : null;

  // Team identity theme — deterministic per team, no schema change needed.
  const theme = getTheme(opponent?.name ?? team.name);

  return (
    <main className="relative min-h-screen overflow-hidden bg-ink text-white">
      <div className={`pointer-events-none absolute inset-0 bg-gradient-to-b ${theme.heroFrom}/25 via-transparent to-transparent`} />
      <div className="pointer-events-none absolute inset-0 bg-[radial-gradient(circle_at_50%_-10%,rgba(255,176,32,0.12),transparent_55%)]" />

      <div className="relative mx-auto flex min-h-screen max-w-md flex-col px-5 py-10">
        <div className="animate-fade-up text-center">
          {featured?.match?.competition?.name && (
            <p className={`mb-2 flex items-center justify-center gap-1.5 text-xs font-semibold uppercase tracking-[0.25em] ${theme.chipText}`}>
              <Trophy size={14} /> {featured.match.competition.name}
            </p>
          )}
          <p className="text-sm text-white/50">Byenveni</p>
          <h1 className="mt-1 font-display text-3xl font-bold">{team.name}</h1>
        </div>

        {featured?.match ? (
          <MatchCard team={team as Team} lineup={featured} theme={theme} />
        ) : (
          <div className="animate-fade-up mt-10 rounded-2xl border border-ink-line bg-ink-panel p-6 text-center text-ink-muted">
            Pa gen match ki pwograme pou kounye a.
          </div>
        )}

        <div className="animate-fade-up mt-auto pt-10 text-center">
          <Link href={`/team/${params.token}/login`}>
            <Button size="lg" className="w-full">
              LOGIN
            </Button>
          </Link>
          <p className="mt-4 text-xs text-white/30">Platfòm Jesyon Match Konpetisyon</p>
        </div>
      </div>
    </main>
  );
}

function MatchCard({ team, lineup, theme }: { team: Team; lineup: any; theme: ReturnType<typeof getTheme> }) {
  const m = lineup.match;
  const isHome = m.home_team_id === team.id;
  const opponent = isHome ? m.away_team : m.home_team;

  return (
    <div
      className={`animate-fade-up mt-8 overflow-hidden rounded-3xl border border-white/10 bg-gradient-to-br ${theme.heroFrom} ${theme.heroTo} p-6 shadow-[0_25px_60px_-15px_rgba(0,0,0,0.6)]`}
    >
      <div className="flex items-center justify-between">
        <TeamBadge t={team} />
        <span className="font-display text-sm text-white/60">KONT</span>
        <TeamBadge t={opponent} />
      </div>

      <div className="mt-6 flex flex-col gap-2 border-t border-white/15 pt-4 text-sm text-white/80">
        <div className="flex items-center gap-2">
          <CalendarDays size={15} className="text-white/60" />
          {formatMatchDate(m.match_date, m.match_time)}
        </div>
        <div className="flex items-center gap-2">
          <Clock size={15} className="text-white/60" />
          {m.match_time?.slice(0, 5)}
        </div>
        <div className="flex items-center gap-2">
          <MapPin size={15} className="text-white/60" />
          {m.venue || `Teren ${m.home_team?.name}`}
        </div>
      </div>
    </div>
  );
}

function TeamBadge({ t }: { t: Team }) {
  return (
    <div className="flex flex-1 flex-col items-center gap-2 text-center">
      {t.logo_url ? (
        <Image src={t.logo_url} alt="" width={56} height={56} className="h-14 w-14 rounded-full bg-white/10 object-cover ring-2 ring-white/30" />
      ) : (
        <div className="flex h-14 w-14 items-center justify-center rounded-full bg-white/10 font-display text-sm ring-2 ring-white/30">
          {t.name.slice(0, 2).toUpperCase()}
        </div>
      )}
      <span className="max-w-[6.5rem] truncate text-xs font-medium text-white/90">{t.name}</span>
    </div>
  );
}
