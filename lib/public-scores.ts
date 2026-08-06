import "server-only";
import { supabaseAdmin } from "@/lib/supabase-admin";
import type { MatchLiveStatus } from "@/lib/types";

/**
 * GGScoreLive's list read model — the companion to getPublicMatchView in
 * lib/public-match.ts. Same public-DTO discipline: only what's safe for an
 * anonymous visitor (team name/logo, scores, kickoff time), never
 * coach_phone/coach_email/token or anything else private.
 */

export type PublicScoreTeam = { name: string; logoUrl: string | null };

export type PublicScoreMatch = {
  matchId: string;
  competitionId: string | null;
  competitionName: string | null;
  round: string | null;
  matchDate: string;
  matchTime: string;
  liveStatus: MatchLiveStatus;
  isLive: boolean;
  homeScore: number;
  awayScore: number;
  homeTeam: PublicScoreTeam;
  awayTeam: PublicScoreTeam;
};

export type PublicScoresFeed = {
  live: PublicScoreMatch[];
  today: PublicScoreMatch[];
  past: PublicScoreMatch[];
  next: PublicScoreMatch[];
};

export type PublicCompetitionOption = { id: string; name: string };

const MATCH_SELECT = `id, competition_id, round, match_date, match_time, live_status, home_score, away_score,
       competition:competitions(name),
       home_team:teams!matches_home_team_id_fkey(name, logo_url),
       away_team:teams!matches_away_team_id_fkey(name, logo_url)`;

type MatchRow = {
  id: string;
  competition_id: string | null;
  round: string | null;
  match_date: string;
  match_time: string;
  live_status: MatchLiveStatus | null;
  home_score: number | null;
  away_score: number | null;
  competition: { name: string } | null;
  home_team: { name: string; logo_url: string | null } | null;
  away_team: { name: string; logo_url: string | null } | null;
};

/** en-CA gives YYYY-MM-DD directly. America/Port-au-Prince has no DST since 2015 — a fixed UTC-4/UTC-5 split is more code than this needs. */
export function todayInHaiti(): string {
  return new Date().toLocaleDateString("en-CA", { timeZone: "America/Port-au-Prince" });
}

/** Row -> public DTO, shared by every query in this module so a schema/column change or a DTO-shape fix only happens once. */
function toPublicScoreMatch(r: MatchRow): PublicScoreMatch {
  const status = r.live_status ?? "pre_match";
  const isLive = status !== "pre_match" && status !== "full_time";
  return {
    matchId: r.id,
    competitionId: r.competition_id,
    competitionName: r.competition?.name ?? null,
    round: r.round,
    matchDate: r.match_date,
    matchTime: r.match_time,
    liveStatus: status,
    isLive,
    homeScore: r.home_score ?? 0,
    awayScore: r.away_score ?? 0,
    homeTeam: { name: r.home_team!.name, logoUrl: r.home_team!.logo_url },
    awayTeam: { name: r.away_team!.name, logoUrl: r.away_team!.logo_url },
  };
}

/**
 * Live/Today/Past/Next buckets — GGScoreLive home's primary feed.
 * `competitionId` scopes every bucket to one competition (the home page's
 * Competition Selector); omit it to show every competition at once, which
 * is also what the platform looks like today with only one competition
 * seeded.
 */
export async function getPublicScoresFeed(competitionId?: string): Promise<PublicScoresFeed> {
  const supabase = supabaseAdmin();
  let query = supabase.from("matches").select(MATCH_SELECT).order("match_date", { ascending: true }).order("match_time", { ascending: true });
  if (competitionId) query = query.eq("competition_id", competitionId);
  const { data } = await query;

  const rows = ((data ?? []) as unknown as MatchRow[]).filter((r) => r.home_team && r.away_team);
  const today = todayInHaiti();

  const feed: PublicScoresFeed = { live: [], today: [], past: [], next: [] };

  for (const r of rows) {
    const match = toPublicScoreMatch(r);
    if (match.isLive) feed.live.push(match);
    if (r.match_date === today) feed.today.push(match);
    else if (r.match_date < today) feed.past.push(match);
    else feed.next.push(match);
  }

  // Most recent first for the past, soonest first for what's ahead.
  feed.past.reverse();
  return feed;
}

/** Every match on one exact calendar date ("YYYY-MM-DD", Haiti-local) — the Date Selector's query. Kickoff-time ascending, same ordering as the feed's own buckets. */
export async function getPublicMatchesForDate(date: string, competitionId?: string): Promise<PublicScoreMatch[]> {
  const supabase = supabaseAdmin();
  let query = supabase.from("matches").select(MATCH_SELECT).eq("match_date", date).order("match_time", { ascending: true });
  if (competitionId) query = query.eq("competition_id", competitionId);
  const { data } = await query;
  return ((data ?? []) as unknown as MatchRow[]).filter((r) => r.home_team && r.away_team).map(toPublicScoreMatch);
}

/**
 * Team-name search across every match — GGScoreLive's Search box. A plain
 * ILIKE against the two team-name columns (via a join filter) rather than
 * a dedicated search index: the platform's total match count is in the
 * tens, not the thousands, so a full-text index would be premature.
 * Matches are returned most-recent-first regardless of past/future, since
 * search is "find this team/matchup," not a chronological browse.
 */
export async function searchPublicMatches(query: string, competitionId?: string): Promise<PublicScoreMatch[]> {
  const trimmed = query.trim();
  if (trimmed.length < 2) return [];

  const supabase = supabaseAdmin();
  let q = supabase
    .from("matches")
    .select(MATCH_SELECT)
    .order("match_date", { ascending: false })
    .order("match_time", { ascending: false })
    .limit(30);
  if (competitionId) q = q.eq("competition_id", competitionId);
  const { data } = await q;

  const needle = trimmed.toLowerCase();
  return ((data ?? []) as unknown as MatchRow[])
    .filter((r) => r.home_team && r.away_team)
    .filter(
      (r) =>
        r.home_team!.name.toLowerCase().includes(needle) ||
        r.away_team!.name.toLowerCase().includes(needle) ||
        r.competition?.name?.toLowerCase().includes(needle) ||
        r.round?.toLowerCase().includes(needle)
    )
    .map(toPublicScoreMatch);
}

/** Every active competition, for the home page's Competition Selector. Archived competitions are excluded — same "active" convention CompetitionsExplorer/getPublicGroups already use, and a null status (pre-Foundation-migration rows) counts as active. */
export async function listPublicCompetitions(): Promise<PublicCompetitionOption[]> {
  const supabase = supabaseAdmin();
  const { data } = await supabase.from("competitions").select("id, name, status").order("name");
  return ((data ?? []) as { id: string; name: string; status: string | null }[])
    .filter((c) => (c.status ?? "active") === "active")
    .map((c) => ({ id: c.id, name: c.name }));
}
