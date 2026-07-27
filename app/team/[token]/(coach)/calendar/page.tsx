import { CalendarX2 } from "lucide-react";
import { requireCoach } from "@/lib/coach-auth";
import { supabaseAdmin } from "@/lib/supabase-admin";
import MatchListItem from "@/components/coach/MatchListItem";

export const dynamic = "force-dynamic";

function groupByMonth(items: any[]) {
  const groups = new Map<string, any[]>();
  for (const item of items) {
    const d = new Date(`${item.match.match_date}T${item.match.match_time}`);
    const key = d.toLocaleDateString("fr-HT", { month: "long", year: "numeric" });
    if (!groups.has(key)) groups.set(key, []);
    groups.get(key)!.push(item);
  }
  return Array.from(groups.entries());
}

export default async function CalendarPage({ params }: { params: { token: string } }) {
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
  const past = list
    .filter((l) => new Date(`${l.match.match_date}T${l.match.match_time}`).getTime() < now)
    .sort(
      (a, b) =>
        new Date(`${b.match.match_date}T${b.match.match_time}`).getTime() -
        new Date(`${a.match.match_date}T${a.match.match_time}`).getTime()
    );

  const upcomingGroups = groupByMonth(upcoming);
  const pastGroups = groupByMonth(past);

  return (
    <div className="flex flex-col gap-7">
      <div>
        <h1 className="font-display text-2xl font-semibold text-ink">Kalandriye Match</h1>
        <p className="text-sm text-ink/50">{team.name}</p>
      </div>

      <section className="flex flex-col gap-5">
        {upcomingGroups.length === 0 && <EmptyState label="Pa gen match ki pwograme." />}
        {upcomingGroups.map(([month, items]) => (
          <div key={month}>
            <h2 className="mb-2 font-display text-xs font-semibold uppercase tracking-wide text-ink/40">
              {month}
            </h2>
            <div className="flex flex-col gap-2">
              {items.map((l, i) => {
                const opp = l.match.home_team_id === team.id ? l.match.away_team : l.match.home_team;
                return (
                  <MatchListItem
                    key={l.id}
                    token={params.token}
                    matchId={l.match_id}
                    opponentName={opp?.name ?? "—"}
                    opponentLogoUrl={opp?.logo_url}
                    homeTeamName={l.match.home_team?.name}
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
        ))}
      </section>

      <section id="past" className="flex flex-col gap-5 scroll-mt-20">
        <h2 className="font-display text-sm font-semibold uppercase tracking-wide text-ink/50">
          Match ki fin jwe
        </h2>
        {pastGroups.length === 0 && <EmptyState label="Pa gen match ki fin jwe." />}
        {pastGroups.map(([month, items]) => (
          <div key={month}>
            <h3 className="mb-2 font-display text-xs font-semibold uppercase tracking-wide text-ink/40">
              {month}
            </h3>
            <div className="flex flex-col gap-2 opacity-80">
              {items.map((l, i) => {
                const opp = l.match.home_team_id === team.id ? l.match.away_team : l.match.home_team;
                return (
                  <MatchListItem
                    key={l.id}
                    token={params.token}
                    matchId={l.match_id}
                    opponentName={opp?.name ?? "—"}
                    opponentLogoUrl={opp?.logo_url}
                    homeTeamName={l.match.home_team?.name}
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
        ))}
      </section>
    </div>
  );
}

function EmptyState({ label }: { label: string }) {
  return (
    <div className="flex flex-col items-center gap-2 rounded-2xl bg-coach-card py-8 text-center text-ink/40 shadow-sm">
      <CalendarX2 size={22} />
      <p className="text-sm">{label}</p>
    </div>
  );
}
