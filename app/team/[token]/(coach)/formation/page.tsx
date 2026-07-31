import { requireCoach } from "@/lib/coach-auth";
import { getTacticalFormation } from "@/lib/tactical-formation";
import { supabaseAdmin } from "@/lib/supabase-admin";
import { getTheme } from "@/lib/team-theme";
import CoachFormationEditor from "@/components/coach/CoachFormationEditor";
import type { Player } from "@/lib/types";

export const dynamic = "force-dynamic";

/**
 * Coach's own consumer of the Formation Engine — the second permission
 * boundary (Admin/Broadcast's is app/live/[matchId]/formation/page.tsx).
 * Same engine, same validation, same persistence
 * (app/team/[token]/actions.ts's saveTeamFormation calls the identical
 * saveFormationCore Admin's action calls) — only the access gate and the
 * shell around it differ. No team-switcher (a coach has exactly one
 * team), no Broadcast-only tabs.
 */
export default async function CoachFormationPage({
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
    .select("*, match:matches(*, home_team:teams!matches_home_team_id_fkey(*), away_team:teams!matches_away_team_id_fkey(*))")
    .eq("team_id", team.id)
    .order("match_id");

  const list = (lineups ?? []) as any[];

  // Same default-selection logic as the Lineup page: an explicit ?match=
  // deep link, else whichever lineup still needs attention, else the most
  // recent match.
  const active =
    (searchParams.match && list.find((l) => l.match_id === searchParams.match)) ||
    list.find((l) => l.status === "waiting" || l.status === "needs_correction") ||
    list.sort((a, b) => (a.match?.match_date < b.match?.match_date ? 1 : -1))[0];

  if (!active) {
    return (
      <main className="flex min-h-[60vh] items-center justify-center px-4 text-center">
        <p className="text-ink/60">Pa gen match ki pwograme pou kounye a.</p>
      </main>
    );
  }

  const { data: players } = await supabase.from("players").select("*").eq("team_id", team.id).order("number");
  const saved = await getTacticalFormation(active.match_id, team.id);
  const theme = getTheme(team.name);

  const opponent = active.match.home_team_id === team.id ? active.match.away_team : active.match.home_team;

  return (
    <div className="flex flex-col gap-4">
      <div>
        <h1 className="font-display text-xl font-semibold text-ink">Fòmasyon</h1>
        <p className="text-sm text-ink/40">
          Kont {opponent?.name ?? "—"} — plase 11 titilè yo sou teren an.
        </p>
      </div>

      <CoachFormationEditor
        token={params.token}
        matchId={active.match_id}
        team={{
          id: team.id,
          name: team.name,
          players: (players ?? []) as Player[],
          startingXi: active.starting_xi ?? [],
          substituteIds: active.substitutes ?? [],
          captainId: active.captain_id ?? null,
          saved,
        }}
        theme={theme}
        locked={Boolean(active.locked)}
      />
    </div>
  );
}
