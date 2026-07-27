import { requireCoach } from "@/lib/coach-auth";
import { supabaseAdmin } from "@/lib/supabase-admin";
import LineupForm from "../../LineupForm";
import type { Player, Team } from "@/lib/types";

// Always render on request — this page reads live data via the service-role
// Supabase client, and must never be executed or cached at build time.
export const dynamic = "force-dynamic";

/**
 * The original lineup submission page — same component, same server action
 * (../../actions.ts, imported by LineupForm), same submission logic as
 * before. Only two things changed: it now lives behind coach login, and it
 * accepts an optional ?match= so the Calendar can deep-link into a specific
 * match's lineup instead of always the "active" one.
 */
export default async function LineupPage({
  params,
  searchParams,
}: {
  params: { token: string };
  searchParams: { match?: string };
}) {
  const { team } = await requireCoach(params.token);

  const supabase = supabaseAdmin();
  const { data: lineups } = await supabase
    .from("lineups")
    .select(
      "*, match:matches(*, competition:competitions(*), home_team:teams!matches_home_team_id_fkey(*), away_team:teams!matches_away_team_id_fkey(*))"
    )
    .eq("team_id", team.id)
    .order("match_id");

  const list = (lineups ?? []) as any[];

  // Same default-selection logic as the original single-page flow.
  const active =
    (searchParams.match && list.find((l) => l.match_id === searchParams.match)) ||
    list.find((l) => l.status === "waiting" || l.status === "needs_correction") ||
    list.sort((a, b) => (a.match?.match_date < b.match?.match_date ? 1 : -1))[0];

  const { data: players } = await supabase
    .from("players")
    .select("*")
    .eq("team_id", team.id)
    .order("number");

  if (!active) {
    return (
      <main className="flex min-h-[60vh] items-center justify-center px-4 text-center">
        <p className="text-ink/60">Pa gen match ki pwograme pou kounye a.</p>
      </main>
    );
  }

  const opponent = active.match.home_team_id === team.id ? active.match.away_team : active.match.home_team;
  const isHome = active.match.home_team_id === team.id;

  return (
    <LineupForm
      team={team as Team}
      players={(players ?? []) as Player[]}
      lineup={active}
      opponent={opponent}
      isHome={isHome}
      competitionName={active.match.competition?.name ?? null}
      round={active.match.round}
      token={params.token}
    />
  );
}
