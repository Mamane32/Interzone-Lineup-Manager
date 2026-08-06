import "server-only";
import { supabaseAdmin } from "@/lib/supabase-admin";
import { getPublicGroups, type PublicGroup } from "@/lib/public-groups";
import { listPublicNews, type PublicNewsArticle } from "@/lib/public-news";
import type { MatchLiveStatus } from "@/lib/types";

/**
 * GGScoreLive's Archive (Sprint 4 Phase 7) — previous editions, i.e.
 * competitions an admin has archived (competitions.status = 'archived',
 * set from Admin → Competitions; see app/admin/competitions/actions.ts's
 * setCompetitionStatus). Archiving a competition never cascades to its
 * groups/stages/divisions, so every read here scopes explicitly by
 * competition_id rather than assuming an archived competition's children
 * are marked archived too. Same public-DTO discipline as every other
 * lib/public-*.ts module.
 */

export type ArchivedCompetitionSummary = {
  id: string;
  name: string;
  shortName: string | null;
  logoUrl: string | null;
  seasons: { id: string; name: string; year: number | null }[];
};

export type ArchiveTopScorer = {
  playerId: string;
  playerName: string;
  teamName: string;
  goals: number;
};

export type ArchivedCompetitionDetail = ArchivedCompetitionSummary & {
  description: string | null;
  groups: PublicGroup[];
  results: {
    matchId: string;
    round: string | null;
    matchDate: string;
    homeTeam: { name: string; logoUrl: string | null };
    awayTeam: { name: string; logoUrl: string | null };
    homeScore: number | null;
    awayScore: number | null;
  }[];
  totalMatches: number;
  totalGoals: number;
  topScorers: ArchiveTopScorer[];
  news: PublicNewsArticle[];
};

export async function listArchivedCompetitions(): Promise<ArchivedCompetitionSummary[]> {
  const supabase = supabaseAdmin();

  const { data: competitions } = await supabase
    .from("competitions")
    .select("id, name, short_name, logo_url")
    .eq("status", "archived")
    .order("name");

  const rows = (competitions ?? []) as { id: string; name: string; short_name: string | null; logo_url: string | null }[];
  if (rows.length === 0) return [];

  const { data: seasons } = await supabase
    .from("seasons")
    .select("id, name, year, competition_id")
    .in(
      "competition_id",
      rows.map((c) => c.id)
    )
    .order("year", { ascending: false });

  const seasonsByCompetition = new Map<string, { id: string; name: string; year: number | null }[]>();
  for (const s of (seasons ?? []) as { id: string; name: string; year: number | null; competition_id: string }[]) {
    const list = seasonsByCompetition.get(s.competition_id) ?? [];
    list.push({ id: s.id, name: s.name, year: s.year });
    seasonsByCompetition.set(s.competition_id, list);
  }

  return rows.map((c) => ({
    id: c.id,
    name: c.name,
    shortName: c.short_name,
    logoUrl: c.logo_url,
    seasons: seasonsByCompetition.get(c.id) ?? [],
  }));
}

export async function getArchivedCompetitionDetail(competitionId: string): Promise<ArchivedCompetitionDetail | null> {
  const supabase = supabaseAdmin();

  const { data: competition } = await supabase
    .from("competitions")
    .select("id, name, short_name, logo_url, description")
    .eq("id", competitionId)
    .eq("status", "archived")
    .maybeSingle();

  if (!competition) return null;

  const { data: seasons } = await supabase.from("seasons").select("id, name, year").eq("competition_id", competitionId).order("year", { ascending: false });

  const [groups, matchesResult, news] = await Promise.all([
    getPublicGroups({ competitionId }),
    supabase
      .from("matches")
      .select(
        `id, round, match_date, home_score, away_score, live_status,
         home_team:teams!matches_home_team_id_fkey(id, name, logo_url),
         away_team:teams!matches_away_team_id_fkey(id, name, logo_url)`
      )
      .eq("competition_id", competitionId)
      .order("match_date", { ascending: false }),
    listPublicNews({ competitionId, limit: 6 }),
  ]);

  type MatchRow = {
    id: string;
    round: string | null;
    match_date: string;
    home_score: number | null;
    away_score: number | null;
    live_status: MatchLiveStatus | null;
    home_team: { id: string; name: string; logo_url: string | null };
    away_team: { id: string; name: string; logo_url: string | null };
  };

  const matches = ((matchesResult.data ?? []) as unknown as MatchRow[]).filter((m) => m.home_team && m.away_team);
  const finishedMatches = matches.filter((m) => m.live_status === "full_time");

  const results = matches.map((m) => ({
    matchId: m.id,
    round: m.round,
    matchDate: m.match_date,
    homeTeam: { name: m.home_team.name, logoUrl: m.home_team.logo_url },
    awayTeam: { name: m.away_team.name, logoUrl: m.away_team.logo_url },
    homeScore: m.home_score,
    awayScore: m.away_score,
  }));

  const totalGoals = finishedMatches.reduce((sum, m) => sum + (m.home_score ?? 0) + (m.away_score ?? 0), 0);

  const topScorers = matches.length === 0 ? [] : await computeTopScorers(matches.map((m) => m.id));

  return {
    id: competition.id,
    name: competition.name,
    shortName: competition.short_name,
    logoUrl: competition.logo_url,
    description: competition.description,
    seasons: ((seasons ?? []) as { id: string; name: string; year: number | null }[]).map((s) => ({ id: s.id, name: s.name, year: s.year })),
    groups,
    results,
    totalMatches: finishedMatches.length,
    totalGoals,
    topScorers,
    news,
  };
}

/** Own goals count against the scoring team, not for the player who put it in — so only `goal`/`penalty_goal` events count toward a top-scorer table. */
async function computeTopScorers(matchIds: string[]): Promise<ArchiveTopScorer[]> {
  const supabase = supabaseAdmin();
  const { data } = await supabase
    .from("match_events")
    .select("player_id, type, player:players(id, full_name), team:teams(name)")
    .in("match_id", matchIds)
    .in("type", ["goal", "penalty_goal"]);

  type EventRow = { player_id: string | null; player: { id: string; full_name: string } | null; team: { name: string } | null };
  const goalsByPlayer = new Map<string, ArchiveTopScorer>();
  for (const e of (data ?? []) as unknown as EventRow[]) {
    if (!e.player_id || !e.player) continue;
    const existing = goalsByPlayer.get(e.player_id);
    if (existing) {
      existing.goals += 1;
    } else {
      goalsByPlayer.set(e.player_id, { playerId: e.player_id, playerName: e.player.full_name, teamName: e.team?.name ?? "", goals: 1 });
    }
  }

  return [...goalsByPlayer.values()].sort((a, b) => b.goals - a.goals).slice(0, 10);
}
