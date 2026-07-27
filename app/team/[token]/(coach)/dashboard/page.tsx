import Link from "next/link";
import { ClipboardList, History, CalendarDays, UserCircle2, Trophy, MapPin } from "lucide-react";
import { requireCoach } from "@/lib/coach-auth";
import { supabaseAdmin } from "@/lib/supabase-admin";
import CountdownTimer from "@/components/coach/CountdownTimer";
import MatchListItem from "@/components/coach/MatchListItem";
import NotificationsPanel, { type NotificationItem } from "@/components/coach/NotificationsPanel";
import StatusBadge from "@/components/ui/StatusBadge";
import { getTheme } from "@/lib/team-theme";
import type { Team } from "@/lib/types";

export const dynamic = "force-dynamic";

export default async function DashboardPage({ params }: { params: { token: string } }) {
  const { team } = await requireCoach(params.token);

  const supabase = supabaseAdmin();
  const { data: lineups } = await supabase
    .from("lineups")
    .select(
      "*, match:matches(*, competition:competitions(*), home_team:teams!matches_home_team_id_fkey(*), away_team:teams!matches_away_team_id_fkey(*))"
    )
    .eq("team_id", team.id);

  const list = (lineups ?? []).filter((l: any) => l.match) as any[];
  const now = Date.now();
  const upcoming = list
    .filter((l) => new Date(`${l.match.match_date}T${l.match.match_time}`).getTime() >= now)
    .sort(
      (a, b) =>
        new Date(`${a.match.match_date}T${a.match.match_time}`).getTime() -
        new Date(`${b.match.match_date}T${b.match.match_time}`).getTime()
    );
  const submitted = list
    .filter((l) => l.status === "submitted" && l.submitted_at)
    .sort((a, b) => new Date(b.submitted_at).getTime() - new Date(a.submitted_at).getTime());

  const next = upcoming[0];
  const nextOpponent: Team | null = next ? (next.match.home_team_id === team.id ? next.match.away_team : next.match.home_team) : null;
  const nextISO = next ? `${next.match.match_date}T${next.match.match_time}` : null;
  const nextHomeTeam: Team | null = next ? next.match.home_team : null;

  const notifications: NotificationItem[] = [];
  if (next && nextISO) {
    const hoursAway = (new Date(nextISO).getTime() - now) / 3600000;
    notifications.push({
      id: "scheduled",
      icon: "scheduled",
      title: "Match Pwograme",
      body: `Kont ${nextOpponent?.name ?? ""} — ${new Date(nextISO).toLocaleDateString("fr-HT", { day: "2-digit", month: "short" })}`,
    });
    if (hoursAway <= 24 && hoursAway > 1) {
      notifications.push({ id: "r24", icon: "reminder24", title: "Rapèl 24 Èdtan", body: "Match la se demen. Verifye lis ekip ou." });
    }
    if (hoursAway <= 1 && hoursAway > 0) {
      notifications.push({ id: "r1", icon: "reminder1", title: "Rapèl 1 Èdtan", body: "Match la ap kòmanse byento." });
    }
  }
  if (submitted[0]) {
    notifications.push({
      id: "submitted",
      icon: "submitted",
      title: "Lis Ekip Voye",
      body: `Voye nan ${new Date(submitted[0].submitted_at).toLocaleTimeString("fr-HT", { hour: "2-digit", minute: "2-digit" })}`,
    });
  }
  notifications.push({
    id: "admin-example",
    icon: "announcement",
    title: "Mesaj Administratè",
    body: "Tanpri konfime kapitèn ekip la anvan match la.",
  });

  const competitionTheme = getTheme(next?.match?.competition?.id ?? team.competition_id);
  const matchTheme = getTheme(nextOpponent?.name ?? team.name);

  return (
    <div className="flex flex-col gap-6">
      {/* Top bar — greeting + notifications */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <div className="flex h-11 w-11 items-center justify-center rounded-full bg-ink font-display text-sm text-white">
            {team.coach_name.slice(0, 2).toUpperCase()}
          </div>
          <div>
            <p className="text-xs text-ink/40">Byenveni,</p>
            <p className="font-display text-base font-semibold text-ink">{team.coach_name}</p>
          </div>
        </div>
        <NotificationsPanel items={notifications} />
      </div>

      {/* Hero match card */}
      {next ? (
        <div
          className={`animate-fade-up overflow-hidden rounded-3xl bg-gradient-to-br ${matchTheme.heroFrom} ${matchTheme.heroTo} text-white shadow-[0_25px_60px_-20px_rgba(0,0,0,0.5)]`}
        >
          {next.match.competition?.name && (
            <div className={`flex items-center gap-1.5 bg-black/25 px-5 py-2 text-[11px] font-semibold uppercase tracking-[0.15em] ${competitionTheme.chipText}`}>
              <Trophy size={12} /> {next.match.competition.name}
              {next.match.round ? ` · ${next.match.round}` : ""}
            </div>
          )}

          <div className="px-5 pb-5 pt-4">
            <div className="flex items-center justify-between">
              <TeamBadge t={team} />
              <div className="flex flex-col items-center px-2">
                <span className="font-display text-[11px] uppercase tracking-widest text-white/60">Kont</span>
                <span className="mt-1 font-display text-2xl font-bold">VS</span>
              </div>
              <TeamBadge t={nextOpponent} />
            </div>

            <div className="mt-5 flex flex-col items-center gap-3 border-t border-white/15 pt-4">
              <CountdownTimer targetISO={nextISO!} />
              <div className="flex items-center gap-3">
                <StatusBadge status={next.status} />
                {nextHomeTeam && (
                  <span className="flex items-center gap-1 text-xs text-white/60">
                    <MapPin size={12} /> {next.match.venue || `Teren ${nextHomeTeam.name}`}
                  </span>
                )}
              </div>
            </div>
          </div>
        </div>
      ) : (
        <div className="animate-fade-up rounded-3xl bg-gradient-to-br from-ink to-ink-panel p-8 text-center text-white/60 shadow-sm">
          Pa gen match ki pwograme pou kounye a.
        </div>
      )}

      {/* Quick actions */}
      <div className="grid grid-cols-2 gap-3">
        <QuickAction href={`/team/${params.token}/lineup`} icon={ClipboardList} label="Soumèt Lis" index={0} />
        <QuickAction href={`/team/${params.token}/calendar#past`} icon={History} label="Ansyen Lis" index={1} />
        <QuickAction href={`/team/${params.token}/calendar`} icon={CalendarDays} label="Kalandriye" index={2} />
        <QuickAction href={`/team/${params.token}/profile`} icon={UserCircle2} label="Pwofil" index={3} />
      </div>

      {/* Upcoming matches */}
      <div>
        <h2 className="mb-2 font-display text-sm font-semibold uppercase tracking-wide text-ink/50">
          Match k ap vini
        </h2>
        <div className="flex flex-col gap-2">
          {upcoming.length === 0 && <p className="text-sm text-ink/40">Pa gen match ki pwograme.</p>}
          {upcoming.slice(0, 4).map((l, i) => {
            const opp = l.match.home_team_id === team.id ? l.match.away_team : l.match.home_team;
            const homeTeam = l.match.home_team;
            return (
              <MatchListItem
                key={l.id}
                token={params.token}
                matchId={l.match_id}
                opponentName={opp?.name ?? "—"}
                opponentLogoUrl={opp?.logo_url}
                homeTeamName={homeTeam?.name}
                venue={l.match.venue}
                competitionName={l.match.competition?.name}
                matchDate={l.match.match_date}
                matchTime={l.match.match_time}
                status={l.status}
                index={i}
              />
            );
          })}
        </div>
      </div>
    </div>
  );
}

function TeamBadge({ t }: { t: Team | null }) {
  if (!t) return <div className="h-16 w-16" />;
  return (
    <div className="flex flex-1 flex-col items-center gap-2 text-center">
      {t.logo_url ? (
        // eslint-disable-next-line @next/next/no-img-element
        <img src={t.logo_url} alt="" className="h-16 w-16 rounded-full bg-white/10 object-cover ring-2 ring-white/30" />
      ) : (
        <div className="flex h-16 w-16 items-center justify-center rounded-full bg-white/10 font-display text-lg ring-2 ring-white/30">
          {t.name.slice(0, 2).toUpperCase()}
        </div>
      )}
      <span className="max-w-[6.5rem] truncate text-xs font-semibold">{t.name}</span>
    </div>
  );
}

function QuickAction({ href, icon: Icon, label, index = 0 }: { href: string; icon: any; label: string; index?: number }) {
  return (
    <Link
      href={href}
      style={{ "--stagger": index } as React.CSSProperties}
      className="animate-fade-up flex flex-col items-center gap-2 rounded-2xl bg-coach-card p-4 text-center shadow-sm ring-1 ring-black/5 transition-all hover:-translate-y-0.5 hover:shadow-lg active:scale-95"
    >
      <span className="flex h-11 w-11 items-center justify-center rounded-full bg-status-submitted/10 text-status-submitted">
        <Icon size={20} />
      </span>
      <span className="text-xs font-semibold text-ink">{label}</span>
    </Link>
  );
}
