import Link from "next/link";
import { ClipboardList, History, CalendarDays, UserCircle2, Trophy } from "lucide-react";
import { requireCoach } from "@/lib/coach-auth";
import { supabaseAdmin } from "@/lib/supabase-admin";
import CountdownTimer from "@/components/coach/CountdownTimer";
import MatchListItem from "@/components/coach/MatchListItem";
import NotificationsPanel, { type NotificationItem } from "@/components/coach/NotificationsPanel";
import StatusBadge from "@/components/ui/StatusBadge";

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
  const nextOpponent = next ? (next.match.home_team_id === team.id ? next.match.away_team : next.match.home_team) : null;
  const nextISO = next ? `${next.match.match_date}T${next.match.match_time}` : null;

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
    icon: "admin",
    title: "Mesaj Administratè",
    body: "Tanpri konfime kapitèn ekip la anvan match la.",
  });

  return (
    <div className="flex flex-col gap-5">
      {/* Hero */}
      <div className="rounded-2xl bg-gradient-to-br from-ink via-ink to-ink-panel p-5 text-white shadow-[0_20px_50px_-20px_rgba(0,0,0,0.5)]">
        <div className="flex items-start justify-between">
          <div className="flex items-center gap-3">
            <div className="flex h-11 w-11 items-center justify-center rounded-full bg-white/10 font-display text-sm">
              {team.coach_name.slice(0, 2).toUpperCase()}
            </div>
            <div>
              <p className="text-xs text-white/50">Byenveni,</p>
              <p className="font-display text-base font-semibold">{team.coach_name}</p>
            </div>
          </div>
          <NotificationsPanel items={notifications} />
        </div>

        {next ? (
          <div className="mt-5 border-t border-white/10 pt-4">
            <p className="flex items-center gap-1.5 text-xs uppercase tracking-wide text-amber-signal">
              <Trophy size={12} /> {next.match.competition?.name ?? "Match"} · Kont {nextOpponent?.name}
            </p>
            <div className="mt-2">{nextISO && <CountdownTimer targetISO={nextISO} />}</div>
            <div className="mt-3">
              <StatusBadge status={next.status} />
            </div>
          </div>
        ) : (
          <p className="mt-5 border-t border-white/10 pt-4 text-sm text-white/50">
            Pa gen match ki pwograme pou kounye a.
          </p>
        )}
      </div>

      {/* Quick actions */}
      <div className="grid grid-cols-2 gap-3">
        <QuickAction href={`/team/${params.token}/lineup`} icon={ClipboardList} label="Soumèt Lis" />
        <QuickAction href={`/team/${params.token}/calendar#past`} icon={History} label="Ansyen Lis" />
        <QuickAction href={`/team/${params.token}/calendar`} icon={CalendarDays} label="Kalandriye" />
        <QuickAction href={`/team/${params.token}/profile`} icon={UserCircle2} label="Pwofil" />
      </div>

      {/* Upcoming matches */}
      <div>
        <h2 className="mb-2 font-display text-sm font-semibold uppercase tracking-wide text-ink/50">
          Match k ap vini
        </h2>
        <div className="flex flex-col gap-2">
          {upcoming.length === 0 && <p className="text-sm text-ink/40">Pa gen match ki pwograme.</p>}
          {upcoming.slice(0, 4).map((l) => {
            const opp = l.match.home_team_id === team.id ? l.match.away_team : l.match.home_team;
            return (
              <MatchListItem
                key={l.id}
                token={params.token}
                matchId={l.match_id}
                opponentName={opp?.name ?? "—"}
                matchDate={l.match.match_date}
                matchTime={l.match.match_time}
                status={l.status}
              />
            );
          })}
        </div>
      </div>
    </div>
  );
}

function QuickAction({ href, icon: Icon, label }: { href: string; icon: any; label: string }) {
  return (
    <Link
      href={href}
      className="flex flex-col items-center gap-2 rounded-2xl bg-coach-card p-4 text-center shadow-sm transition-transform hover:-translate-y-0.5 hover:shadow-md"
    >
      <span className="flex h-11 w-11 items-center justify-center rounded-full bg-status-submitted/10 text-status-submitted">
        <Icon size={20} />
      </span>
      <span className="text-xs font-semibold text-ink">{label}</span>
    </Link>
  );
}
