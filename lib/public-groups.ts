import "server-only";
import { supabaseAdmin } from "@/lib/supabase-admin";
import { computeStandings, type StandingRow } from "@/lib/standings";
import type { MatchLiveStatus } from "@/lib/types";

/** GGScoreLive's group-stage read model — public DTO, same discipline as
 * lib/public-match.ts and lib/public-scores.ts (team name/logo only, never
 * coach contact info). Team membership in a group is derived from which
 * group's matches a team appears in — there is no separate roster table
 * (see lib/standings.ts's doc comment on the data model). */

export type PublicGroup = {
  groupId: string;
  name: string;
  competitionId: string | null;
  competitionName: string | null;
  standings: StandingRow[];
};

/** `competitionId` scopes to one competition's groups — used by the Archive (Phase 7) to pull a past edition's final standings without touching every other competition's groups. Omitted, every active group across every competition comes back, same as before. */
export async function getPublicGroups(filters: { competitionId?: string } = {}): Promise<PublicGroup[]> {
  const supabase = supabaseAdmin();

  const { data: groups } = await supabase
    .from("competition_groups")
    .select("id, name, display_order, status, stage:stages(division:divisions(season:seasons(competition:competitions(id, name))))")
    .eq("status", "active")
    .order("display_order");

  let groupList = (groups ?? []) as unknown as {
    id: string;
    name: string;
    stage: { division: { season: { competition: { id: string; name: string } | null } | null } | null } | null;
  }[];

  if (filters.competitionId) {
    groupList = groupList.filter((g) => g.stage?.division?.season?.competition?.id === filters.competitionId);
  }

  if (groupList.length === 0) return [];

  const { data: matches } = await supabase
    .from("matches")
    .select(
      `group_id, home_score, away_score, live_status, match_date,
       home_team:teams!matches_home_team_id_fkey(id, name, logo_url),
       away_team:teams!matches_away_team_id_fkey(id, name, logo_url)`
    )
    .in(
      "group_id",
      groupList.map((g) => g.id)
    );

  type MatchRow = {
    group_id: string;
    home_score: number | null;
    away_score: number | null;
    live_status: MatchLiveStatus | null;
    match_date: string;
    home_team: { id: string; name: string; logo_url: string | null };
    away_team: { id: string; name: string; logo_url: string | null };
  };

  const matchesByGroup = new Map<string, MatchRow[]>();
  for (const m of (matches ?? []) as unknown as MatchRow[]) {
    if (!m.home_team || !m.away_team) continue;
    const list = matchesByGroup.get(m.group_id) ?? [];
    list.push(m);
    matchesByGroup.set(m.group_id, list);
  }

  return groupList.map((g) => {
    const groupMatches = matchesByGroup.get(g.id) ?? [];
    const teamsById = new Map<string, { id: string; name: string; logoUrl: string | null }>();
    for (const m of groupMatches) {
      teamsById.set(m.home_team.id, { id: m.home_team.id, name: m.home_team.name, logoUrl: m.home_team.logo_url });
      teamsById.set(m.away_team.id, { id: m.away_team.id, name: m.away_team.name, logoUrl: m.away_team.logo_url });
    }

    const standings = computeStandings(
      [...teamsById.values()],
      groupMatches.map((m) => ({
        homeTeamId: m.home_team.id,
        awayTeamId: m.away_team.id,
        homeScore: m.home_score ?? 0,
        awayScore: m.away_score ?? 0,
        isFinished: m.live_status === "full_time",
        matchDate: m.match_date,
      }))
    );

    return {
      groupId: g.id,
      name: g.name,
      competitionId: g.stage?.division?.season?.competition?.id ?? null,
      competitionName: g.stage?.division?.season?.competition?.name ?? null,
      standings,
    };
  });
}
