import { requireCoach } from "@/lib/coach-auth";
import { supabaseAdmin } from "@/lib/supabase-admin";
import MatchListItem from "@/components/coach/MatchListItem";

export const dynamic = "force-dynamic";

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

  return (
    <div className="flex flex-col gap-6">
      <div>
        <h1 className="font-display text-2xl font-semibold text-ink">Kalandriye Match</h1>
        <p className="text-sm text-ink/50">{team.name}</p>
      </div>

      <section>
        <h2 className="mb-2 font-display text-sm font-semibold uppercase tracking-wide text-ink/50">
          Match k ap vini
        </h2>
        <div className="flex flex-col gap-2">
          {upcoming.length === 0 && <p className="text-sm text-ink/40">Pa gen match ki pwograme.</p>}
          {upcoming.map((l) => {
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
      </section>

      <section id="past">
        <h2 className="mb-2 font-display text-sm font-semibold uppercase tracking-wide text-ink/50">
          Match ki fin jwe
        </h2>
        <div className="flex flex-col gap-2">
          {past.length === 0 && <p className="text-sm text-ink/40">Pa gen match ki fin jwe.</p>}
          {past.map((l) => {
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
      </section>
    </div>
  );
}
