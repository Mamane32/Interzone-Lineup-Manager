import Link from "next/link";
import Image from "next/image";
import {
  AlertTriangle,
  Building2,
  CalendarDays,
  CheckCircle2,
  ClipboardList,
  Clock,
  MapPin,
  Plus,
  Radio,
  ShieldCheck,
  Trophy,
  UserPlus,
  Users2,
} from "lucide-react";
import { supabaseAdmin } from "@/lib/supabase-admin";
import EmptyState from "@/components/ui/EmptyState";
import PageHeader from "@/components/ui/PageHeader";
import KpiCard from "@/components/ui/KpiCard";
import BarTrend from "@/components/ui/BarTrend";
import DonutStat from "@/components/ui/DonutStat";
import StatusBadge from "@/components/ui/StatusBadge";
import MatchCountdown from "@/components/ui/MatchCountdown";
import type { Lineup, MatchLiveStatus, MatchWithTeams, Team } from "@/lib/types";
import { requireAdmin } from "@/lib/access";

const LIVE_STATUS_LABEL: Record<MatchLiveStatus, string> = {
  pre_match: "Pre Match",
  kickoff: "Kick Off",
  first_half: "First Half",
  half_time: "Half-time",
  second_half: "Second Half",
  extra_time: "Extra Time",
  penalty_shootout: "Penalties",
  full_time: "Full Time",
};
const IN_PROGRESS_STATUSES: MatchLiveStatus[] = ["kickoff", "first_half", "half_time", "second_half", "extra_time", "penalty_shootout"];

export const dynamic = "force-dynamic";

// Bounded to a recent-and-upcoming operational window rather than every
// match ever scheduled — this page is "what needs attention now," and an
// unbounded `select("*")` here would grow linearly (and slower) with every
// season the platform accumulates.
const DASHBOARD_WINDOW_DAYS = 7;
const DASHBOARD_MATCH_LIMIT = 50;
const NEEDS_ATTENTION_LIMIT = 6;

async function getBoard() {
  const supabase = supabaseAdmin();
  const since = new Date();
  since.setDate(since.getDate() - DASHBOARD_WINDOW_DAYS);
  const previousSince = new Date(since);
  previousSince.setDate(previousSince.getDate() - DASHBOARD_WINDOW_DAYS);
  const sinceStr = since.toISOString().slice(0, 10);
  const previousSinceStr = previousSince.toISOString().slice(0, 10);

  const { data: matches } = await supabase
    .from("matches")
    .select("*, competition:competitions(*), home_team:teams!matches_home_team_id_fkey(*), away_team:teams!matches_away_team_id_fkey(*)")
    .gte("match_date", sinceStr)
    .order("match_date", { ascending: true })
    .order("match_time", { ascending: true })
    .limit(DASHBOARD_MATCH_LIMIT);

  const matchIds = (matches ?? []).map((m) => m.id);
  const { data: lineups } = matchIds.length
    ? await supabase.from("lineups").select("*").in("match_id", matchIds)
    : { data: [] };

  // Cheap head-counts (no rows transferred) purely for the two trend chips —
  // same tables, just a prior comparable window instead of full history.
  const { count: previousMatchCount } = await supabase
    .from("matches")
    .select("id", { count: "exact", head: true })
    .gte("match_date", previousSinceStr)
    .lt("match_date", sinceStr);

  const { count: submittedPreviousWindow } = await supabase
    .from("lineups")
    .select("id", { count: "exact", head: true })
    .gte("submitted_at", previousSince.toISOString())
    .lt("submitted_at", since.toISOString());

  // The "ecosystem scope" strip — cheap head-counts across the org hierarchy
  // so the dashboard reads as commanding an entire operation, not one match.
  const [{ count: organizationCount }, { count: competitionCount }, { count: teamCount }, { count: venueCount }] = await Promise.all([
    supabase.from("organizations").select("id", { count: "exact", head: true }).eq("status", "active"),
    supabase.from("competitions").select("id", { count: "exact", head: true }),
    supabase.from("teams").select("id", { count: "exact", head: true }),
    supabase.from("venues").select("id", { count: "exact", head: true }).eq("status", "active"),
  ]);

  return {
    matches: (matches ?? []) as MatchWithTeams[],
    lineups: (lineups ?? []) as Lineup[],
    previousMatchCount: previousMatchCount ?? 0,
    submittedPreviousWindow: submittedPreviousWindow ?? 0,
    scope: {
      organizations: organizationCount ?? 0,
      competitions: competitionCount ?? 0,
      teams: teamCount ?? 0,
      venues: venueCount ?? 0,
    },
  };
}

function trendPercent(current: number, previous: number): number | undefined {
  if (previous === 0) return current > 0 ? 100 : undefined;
  return Math.round(((current - previous) / previous) * 100);
}

/** { key: "2026-07-24", label: "Thu" } for each of the last `days` days, oldest first. */
function lastNDays(days: number) {
  const out: { key: string; label: string }[] = [];
  const d = new Date();
  d.setDate(d.getDate() - (days - 1));
  for (let i = 0; i < days; i++) {
    out.push({ key: d.toISOString().slice(0, 10), label: d.toLocaleDateString("en", { weekday: "short" }) });
    d.setDate(d.getDate() + 1);
  }
  return out;
}

export default async function DashboardPage() {
  await requireAdmin();
  const { matches, lineups, previousMatchCount, submittedPreviousWindow, scope } = await getBoard();

  const submitted = lineups.filter((l) => l.status === "submitted").length;
  const waiting = lineups.filter((l) => l.status === "waiting").length;
  const needsCorrection = lineups.filter((l) => l.status === "needs_correction").length;
  const completionRate = lineups.length > 0 ? Math.round((submitted / lineups.length) * 100) : 0;

  const todayKey = new Date().toISOString().slice(0, 10);
  const days = lastNDays(DASHBOARD_WINDOW_DAYS);
  const matchesByDay = days.map((d) => ({
    label: d.label,
    value: matches.filter((m) => m.match_date === d.key).length,
    highlight: d.key === todayKey,
  }));
  const submittedByDay = days.map((d) => lineups.filter((l) => l.submitted_at?.slice(0, 10) === d.key).length);

  const matchById = new Map(matches.map((m) => [m.id, m]));
  const needsAttention = lineups
    .filter((l) => l.status !== "submitted")
    .map((l) => {
      const match = matchById.get(l.match_id);
      if (!match) return null;
      const isHome = match.home_team_id === l.team_id;
      const team = isHome ? match.home_team : match.away_team;
      const opponent = isHome ? match.away_team : match.home_team;
      const kickoff = new Date(`${match.match_date}T${match.match_time}`);
      const hoursUntilKickoff = (kickoff.getTime() - Date.now()) / 3_600_000;
      return { lineup: l, match, team, opponent, kickoff, hoursUntilKickoff };
    })
    .filter((x): x is NonNullable<typeof x> => x !== null)
    .sort((a, b) => a.hoursUntilKickoff - b.hoursUntilKickoff)
    .slice(0, NEEDS_ATTENTION_LIMIT);

  const lineupFor = (matchId: string, teamId: string) => lineups.find((l) => l.match_id === matchId && l.team_id === teamId);

  // The Matchday Command hero — what makes this an operations console for
  // running competitions, not a static admin dashboard: what's live right
  // now, and what's next, both computed from the same matches already
  // fetched (live_status/scores are real Broadcast Control Center columns).
  const now = Date.now();
  const liveNow = matches.filter((m) => m.live_status && IN_PROGRESS_STATUSES.includes(m.live_status));
  const todayMatches = matches.filter((m) => m.match_date === todayKey);
  const upcoming = matches
    .filter((m) => new Date(`${m.match_date}T${m.match_time}`).getTime() > now)
    .sort((a, b) => new Date(`${a.match_date}T${a.match_time}`).getTime() - new Date(`${b.match_date}T${b.match_time}`).getTime());
  const nextMatch = upcoming[0];
  const nextMatchToday = todayMatches.find((m) => new Date(`${m.match_date}T${m.match_time}`).getTime() > now);
  const headlineMatch = nextMatchToday ?? nextMatch;
  // Label reflects what's actually being shown, not just "does today have
  // matches at all" — a today fixture that already kicked off (and hasn't
  // been touched in the Broadcast Control Center yet) must not be labeled
  // "Today's matchday" while displaying a countdown to next week's game.
  const headlineIsToday = Boolean(nextMatchToday);

  return (
    <div className="flex flex-col gap-8">
      <PageHeader
        eyebrow="Operations overview"
        title="Overview"
        description="Your matchday picture for the past week and what's ahead — with the workflows that need attention surfaced first."
        actions={
          <div className="flex flex-wrap items-center gap-2">
            <Link href="/live" className="inline-flex h-11 items-center gap-2 rounded-xl border border-white/[0.1] bg-white/[0.04] px-4 text-sm font-semibold text-white transition hover:border-brand-400/40 hover:bg-white/[0.07]">
              <Radio size={16} /> Broadcast Center
            </Link>
            <Link href="/admin/matches" className="inline-flex h-11 items-center gap-2 rounded-xl bg-gradient-to-b from-brand-100 to-brand-400 px-4 text-sm font-semibold text-surface-950 shadow-glow transition hover:-translate-y-0.5">
              <Plus size={16} /> Schedule match
            </Link>
          </div>
        }
      />

      {/* Matchday Command — what makes this an operations console, not a static dashboard */}
      {liveNow.length > 0 ? (
        <div className="surface-panel overflow-hidden border-status-correction/30 p-0">
          <div className="flex items-center gap-2 border-b border-white/[0.08] bg-status-correction/[0.08] px-5 py-3">
            <span className="relative flex h-2.5 w-2.5">
              <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-status-correction opacity-75" />
              <span className="relative inline-flex h-2.5 w-2.5 rounded-full bg-status-correction" />
            </span>
            <p className="text-xs font-bold uppercase tracking-widest text-status-correction">Live now</p>
            <span className="ml-auto text-xs text-white/35">
              {liveNow.length} match{liveNow.length > 1 ? "es" : ""} in progress
            </span>
          </div>
          <div className={`grid gap-px bg-white/[0.06] ${liveNow.length > 1 ? "sm:grid-cols-2" : ""}`}>
            {liveNow.map((m) => (
              <Link key={m.id} href={`/live/${m.id}`} className="pitch-texture flex items-center gap-4 bg-surface-900 p-5 transition hover:bg-surface-850">
                <TeamCrest team={m.home_team} />
                <div className="flex flex-1 flex-col items-center gap-1.5">
                  <p className="font-display text-3xl font-semibold tabular-nums">
                    {m.home_score ?? 0} – {m.away_score ?? 0}
                  </p>
                  <span className="rounded-full bg-white/10 px-2 py-0.5 text-[10px] font-semibold uppercase tracking-wider text-white/60">
                    {m.live_status ? LIVE_STATUS_LABEL[m.live_status] : "Live"}
                  </span>
                </div>
                <TeamCrest team={m.away_team} />
              </Link>
            ))}
          </div>
        </div>
      ) : headlineMatch ? (
        <div className="surface-panel pitch-texture flex flex-col gap-6 p-6 lg:flex-row lg:items-center">
          <div className="flex-1">
            <p className="eyebrow">{headlineIsToday ? "Today's matchday" : "Next kickoff"}</p>
            <div className="mt-3 flex items-center gap-3">
              <TeamCrest team={headlineMatch.home_team} size={40} />
              <span className="font-display text-base font-semibold text-white/25">vs</span>
              <TeamCrest team={headlineMatch.away_team} size={40} />
            </div>
            <p className="mt-3 text-sm text-white/50">
              {headlineMatch.home_team?.name} vs {headlineMatch.away_team?.name} · {headlineMatch.competition?.name ?? "No competition"}
            </p>
            <div className="mt-4">
              <MatchCountdown targetISO={`${headlineMatch.match_date}T${headlineMatch.match_time}`} />
            </div>
          </div>
          {todayMatches.length > 0 && (
            <div className="flex-1 lg:border-l lg:border-white/[0.08] lg:pl-6">
              <p className="mb-3 text-xs font-semibold uppercase tracking-wider text-white/30">
                Today · {todayMatches.length} match{todayMatches.length > 1 ? "es" : ""}
              </p>
              <div className="flex gap-2 overflow-x-auto pb-1">
                {todayMatches.map((m) => (
                  <Link key={m.id} href={`/live/${m.id}`} className="flex flex-none items-center gap-2 rounded-xl border border-white/[0.08] bg-white/[0.03] px-3 py-2 text-xs transition hover:border-brand-400/30">
                    <span className="font-medium">{m.home_team?.name?.slice(0, 3).toUpperCase()}</span>
                    <span className="text-white/25">v</span>
                    <span className="font-medium">{m.away_team?.name?.slice(0, 3).toUpperCase()}</span>
                    <span className="ml-1 text-white/35">{m.match_time?.slice(0, 5)}</span>
                  </Link>
                ))}
              </div>
            </div>
          )}
        </div>
      ) : null}

      {/* Ecosystem scope — the platform is running an entire operation, not one match */}
      <div className="flex flex-wrap items-center gap-x-8 gap-y-3 rounded-2xl border border-white/[0.06] bg-white/[0.02] px-5 py-3.5">
        <span className="text-xs font-semibold uppercase tracking-wider text-white/25">Your operation</span>
        {[
          { label: "Organizations", value: scope.organizations, icon: Building2 },
          { label: "Competitions", value: scope.competitions, icon: Trophy },
          { label: "Teams", value: scope.teams, icon: Users2 },
          { label: "Venues", value: scope.venues, icon: MapPin },
        ].map((s) => (
          <span key={s.label} className="flex items-center gap-2 text-sm">
            <s.icon size={14} className="text-brand-400" />
            <span className="font-display font-semibold text-white">{s.value}</span>
            <span className="text-white/35">{s.label}</span>
          </span>
        ))}
      </div>

      {/* KPI row */}
      <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
        <KpiCard
          label="Matches in view"
          value={matches.length}
          detail="Past week + upcoming"
          icon={CalendarDays}
          trend={trendPercent(matches.length, previousMatchCount)}
          sparkline={matchesByDay.map((d) => d.value)}
        />
        <KpiCard
          label="Lineups submitted (7d)"
          value={submitted}
          detail="vs. the 7 days before"
          icon={CheckCircle2}
          tone="success"
          trend={trendPercent(submitted, submittedPreviousWindow)}
          sparkline={submittedByDay}
        />
        <KpiCard
          label="Needs attention"
          value={waiting + needsCorrection}
          detail={`${needsCorrection} flagged for correction`}
          icon={AlertTriangle}
          tone={waiting + needsCorrection > 0 ? "warning" : "neutral"}
        />
        <KpiCard
          label="Completion rate"
          value={`${completionRate}%`}
          detail={`${submitted} of ${lineups.length} lineup records`}
          icon={ClipboardList}
          tone={completionRate >= 75 ? "success" : completionRate >= 40 ? "brand" : "warning"}
        />
      </div>

      {/* Analytics row */}
      <div className="grid gap-4 lg:grid-cols-[1.6fr_1fr]">
        <div className="surface-panel p-5 sm:p-6">
          <div className="mb-1 flex items-center justify-between">
            <h2 className="font-display text-lg font-semibold">Match activity, last 7 days</h2>
          </div>
          <p className="mb-6 text-xs text-white/35">Matches scheduled per day within the current window.</p>
          <BarTrend data={matchesByDay} />
        </div>

        <div className="surface-panel p-5 sm:p-6">
          <h2 className="mb-1 font-display text-lg font-semibold">Lineup completion</h2>
          <p className="mb-6 text-xs text-white/35">Status of every lineup record in view.</p>
          <DonutStat
            segments={[
              { label: "Submitted", value: submitted, color: "#22C55E" },
              { label: "Waiting", value: waiting, color: "#EAB308" },
              { label: "Needs correction", value: needsCorrection, color: "#EF4444" },
            ]}
          />
        </div>
      </div>

      {/* Quick actions */}
      <div>
        <h2 className="mb-4 font-display text-lg font-semibold">Quick actions</h2>
        <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
          {[
            { href: "/admin/matches", label: "Schedule a match", detail: "Create a fixture and auto-generate lineup slots", icon: CalendarDays },
            { href: "/admin/teams", label: "Add a team", detail: "Register a squad and generate its coach link", icon: Users2 },
            { href: "/live", label: "Open Broadcast Center", detail: "Run live match status, score, and timeline", icon: Radio },
            { href: "/admin/invitations", label: "Invite a user", detail: "Grant a new role or workspace assignment", icon: UserPlus },
          ].map((action) => (
            <Link
              key={action.href}
              href={action.href}
              className="surface-panel group flex flex-col gap-3 p-5 hover:-translate-y-1 hover:border-brand-400/25"
            >
              <span className="flex h-10 w-10 items-center justify-center rounded-xl border border-brand-400/15 bg-brand-400/[0.07] text-brand-400 transition group-hover:bg-brand-400 group-hover:text-surface-950">
                <action.icon size={18} />
              </span>
              <div>
                <p className="text-sm font-semibold">{action.label}</p>
                <p className="mt-1 text-xs leading-5 text-white/35">{action.detail}</p>
              </div>
            </Link>
          ))}
        </div>
      </div>

      {/* Needs attention + match list */}
      <div className="grid gap-4 lg:grid-cols-[1.3fr_1fr]">
        <section>
          <div className="mb-4 flex items-end justify-between">
            <div>
              <h2 className="font-display text-lg font-semibold">Recent &amp; upcoming matches</h2>
              <p className="mt-1 text-xs text-white/35">Submission status for matches in the past week and ahead.</p>
            </div>
            <Link href="/admin/matches" className="text-xs font-semibold text-brand-400 hover:text-brand-100">View all</Link>
          </div>

          {matches.length === 0 ? (
            <EmptyState
              compact
              icon={CalendarDays}
              title="No matches yet"
              description="Create a competition, add teams, then schedule a match to see submission status here."
              action={{ href: "/admin/matches", label: "Create a match" }}
            />
          ) : (
            <div className="flex flex-col gap-3">
              {matches.map((match) => {
                const homeLineup = lineupFor(match.id, match.home_team_id);
                const awayLineup = lineupFor(match.id, match.away_team_id);
                return (
                  <div key={match.id} className="surface-panel p-4">
                    <div className="mb-3 flex items-baseline justify-between gap-3">
                      <p className="font-display text-xs uppercase tracking-wide text-brand-400">
                        {match.competition?.name ?? "No competition"} {match.round ? `· ${match.round}` : ""}
                      </p>
                      <p className="whitespace-nowrap text-xs text-white/35">
                        {new Date(`${match.match_date}T${match.match_time}`).toLocaleString("en", {
                          weekday: "short",
                          day: "2-digit",
                          month: "short",
                          hour: "2-digit",
                          minute: "2-digit",
                        })}
                      </p>
                    </div>
                    <TeamRow team={match.home_team} lineup={homeLineup} />
                    <div className="my-2 border-t border-white/[0.06]" />
                    <TeamRow team={match.away_team} lineup={awayLineup} />
                  </div>
                );
              })}
            </div>
          )}
        </section>

        <section>
          <div className="mb-4">
            <h2 className="font-display text-lg font-semibold">Needs attention</h2>
            <p className="mt-1 text-xs text-white/35">Lineups not yet submitted, soonest kickoff first.</p>
          </div>

          {needsAttention.length === 0 ? (
            <div className="surface-panel flex flex-col items-center gap-3 p-8 text-center">
              <span className="flex h-11 w-11 items-center justify-center rounded-xl border border-emerald-400/15 bg-emerald-400/[0.07] text-emerald-300">
                <ShieldCheck size={19} />
              </span>
              <p className="text-sm font-medium text-white/70">Nothing outstanding</p>
              <p className="text-xs text-white/35">Every lineup in view is submitted.</p>
            </div>
          ) : (
            <div className="flex flex-col gap-2.5">
              {needsAttention.map(({ lineup, team, opponent, hoursUntilKickoff }) => {
                const urgent = hoursUntilKickoff < 24;
                return (
                  <Link
                    key={lineup.id}
                    href={`/admin/lineups/${lineup.id}`}
                    className="surface-panel flex items-center gap-3 p-3.5 hover:border-brand-400/25"
                  >
                    {team?.logo_url ? (
                      <Image src={team.logo_url} alt="" width={36} height={36} className="h-9 w-9 flex-none rounded-full object-cover" />
                    ) : (
                      <div className="flex h-9 w-9 flex-none items-center justify-center rounded-full bg-white/10 text-xs font-display">
                        {team?.name?.slice(0, 2).toUpperCase() ?? "—"}
                      </div>
                    )}
                    <div className="min-w-0 flex-1">
                      <p className="truncate text-sm font-medium">{team?.name ?? "Unknown team"}</p>
                      <p className="truncate text-xs text-white/35">vs {opponent?.name ?? "Unknown"}</p>
                    </div>
                    <div className="flex flex-none flex-col items-end gap-1">
                      <StatusBadge status={lineup.status} />
                      <span className={`inline-flex items-center gap-1 text-[10px] font-medium ${urgent ? "text-status-correction" : "text-white/30"}`}>
                        <Clock size={10} />
                        {hoursUntilKickoff < 0 ? "Kickoff passed" : hoursUntilKickoff < 48 ? `${Math.max(1, Math.round(hoursUntilKickoff))}h to kickoff` : "This week"}
                      </span>
                    </div>
                  </Link>
                );
              })}
            </div>
          )}
        </section>
      </div>
    </div>
  );
}

function TeamCrest({ team, size = 48 }: { team?: Team; size?: number }) {
  if (team?.logo_url) {
    return <Image src={team.logo_url} alt="" width={size} height={size} className="flex-none rounded-full bg-white/10 object-cover" />;
  }
  return (
    <div
      className="flex flex-none items-center justify-center rounded-full bg-white/10 font-display font-semibold"
      style={{ width: size, height: size, fontSize: size * 0.32 }}
    >
      {team?.name?.slice(0, 2).toUpperCase() ?? "—"}
    </div>
  );
}

function TeamRow({ team, lineup }: { team: Team; lineup?: Lineup }) {
  return (
    <Link href={lineup ? `/admin/lineups/${lineup.id}` : "/admin/matches"} className="flex items-center justify-between rounded-lg px-1 py-2 hover:bg-white/5">
      <span className="font-medium">{team?.name ?? "Unknown team"}</span>
      {lineup ? (
        <div className="flex items-center gap-3">
          <StatusBadge status={lineup.status} />
          {lineup.submitted_at && (
            <span className="text-xs text-white/35">
              {new Date(lineup.submitted_at).toLocaleTimeString("en", { hour: "2-digit", minute: "2-digit" })}
            </span>
          )}
        </div>
      ) : (
        <span className="text-xs text-white/35">—</span>
      )}
    </Link>
  );
}
