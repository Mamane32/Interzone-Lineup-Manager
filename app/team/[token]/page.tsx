import { notFound } from "next/navigation";
import { supabaseAdmin } from "@/lib/supabase-admin";
import LineupForm from "./LineupForm";
import type { Player, Team } from "@/lib/types";

// Always render on request — this page reads live data via the service-role
// Supabase client, and must never be executed or cached at build time.
export const dynamic = "force-dynamic";


export default async function CoachPage({ params }: { params: { token: string } }) {
  const supabase = supabaseAdmin();

  const { data: team } = await supabase.from("teams").select("*").eq("token", params.token).single();
  if (!team) notFound();

  const { data: lineups } = await supabase
    .from("lineups")
    .select("*, match:matches(*, competition:competitions(*), home_team:teams!matches_home_team_id_fkey(*), away_team:teams!matches_away_team_id_fkey(*))")
    .eq("team_id", team.id)
    .order("match_id");

  const list = (lineups ?? []) as any[];
  // Prefer a match that still needs action; otherwise show the most recent one.
  const active =
    list.find((l) => l.status === "waiting" || l.status === "needs_correction") ??
    list.sort((a, b) => (a.match?.match_date < b.match?.match_date ? 1 : -1))[0];

  const { data: players } = await supabase
    .from("players")
    .select("*")
    .eq("team_id", team.id)
    .order("number");

  if (!active) {
    return (
      <main className="flex min-h-screen items-center justify-center bg-coach-bg px-4 text-center">
        <div>
          <p className="font-display text-lg font-semibold text-ink">{team.name}</p>
          <p className="mt-2 text-ink/60">Pa gen match ki pwograme pou kounye a.</p>
        </div>
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
