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

function todayInHaiti(): string {
  // America/Port-au-Prince has no DST since 2015 — fixed UTC-4/UTC-5 split
  // is more code than this needs; en-CA gives YYYY-MM-DD directly.
  return new Date().toLocaleDateString("en-CA", { timeZone: "America/Port-au-Prince" });
}

export async function getPublicScoresFeed(): Promise<PublicScoresFeed> {
  const supabase = supabaseAdmin();
  const { data } = await supabase
    .from("matches")
    .select(
      `id, round, match_date, match_time, live_status, home_score, away_score,
       competition:competitions(name),
       home_team:teams!matches_home_team_id_fkey(name, logo_url),
       away_team:teams!matches_away_team_id_fkey(name, logo_url)`
    )
    .order("match_date", { ascending: true })
    .order("match_time", { ascending: true });

  type Row = {
    id: string;
    round: string | null;
    match_date: string;
    match_time: string;
    live_status: MatchLiveStatus | null;
    home_score: number | null;
    away_score: number | null;
    competition: { name: string } | null;
    home_team: { name: string; logo_url: string | null };
    away_team: { name: string; logo_url: string | null };
  };

  const rows = ((data ?? []) as unknown as Row[]).filter((r) => r.home_team && r.away_team);
  const today = todayInHaiti();

  const feed: PublicScoresFeed = { live: [], today: [], past: [], next: [] };

  for (const r of rows) {
    const status = r.live_status ?? "pre_match";
    const isLive = status !== "pre_match" && status !== "full_time";
    const match: PublicScoreMatch = {
      matchId: r.id,
      competitionName: r.competition?.name ?? null,
      round: r.round,
      matchDate: r.match_date,
      matchTime: r.match_time,
      liveStatus: status,
      isLive,
      homeScore: r.home_score ?? 0,
      awayScore: r.away_score ?? 0,
      homeTeam: { name: r.home_team.name, logoUrl: r.home_team.logo_url },
      awayTeam: { name: r.away_team.name, logoUrl: r.away_team.logo_url },
    };

    if (isLive) feed.live.push(match);

    if (r.match_date === today) feed.today.push(match);
    else if (r.match_date < today) feed.past.push(match);
    else feed.next.push(match);
  }

  // Most recent first for the past, soonest first for what's ahead.
  feed.past.reverse();
  return feed;
}
