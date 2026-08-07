import "server-only";
import { supabaseAdmin } from "@/lib/supabase-admin";
import type { PublicScoreTeam } from "@/lib/public-scores";
import type { MatchLiveStatus } from "@/lib/types";

/**
 * GGScoreLive's Streaming Experience (Sprint 4 Phase 8) — public DTO, same
 * discipline as every other lib/public-*.ts module. A watch link is just
 * matches.stream_url (migration 034); nothing here embeds the admin-entered
 * URL in an iframe — it's rendered as a plain outbound link, so there's no
 * need to validate/allowlist the URL's origin before it's safe to render.
 */

export type PublicBroadcast = {
  matchId: string;
  streamUrl: string;
  isLive: boolean;
  isFeatured: boolean;
  competitionName: string | null;
  round: string | null;
  matchDate: string;
  matchTime: string;
  homeTeam: PublicScoreTeam;
  awayTeam: PublicScoreTeam;
  homeScore: number;
  awayScore: number;
  liveStatus: MatchLiveStatus;
};

export type PublicStreamingHub = {
  live: PublicBroadcast[];
  upcoming: PublicBroadcast[];
  replays: PublicBroadcast[];
  featured: PublicBroadcast[];
};

type StreamMatchRow = {
  id: string;
  round: string | null;
  match_date: string;
  match_time: string;
  home_score: number;
  away_score: number;
  live_status: MatchLiveStatus;
  stream_url: string;
  is_featured_broadcast: boolean;
  competition: { name: string } | null;
  home_team: { name: string; logo_url: string | null };
  away_team: { name: string; logo_url: string | null };
};

function toPublicBroadcast(m: StreamMatchRow): PublicBroadcast {
  return {
    matchId: m.id,
    streamUrl: m.stream_url,
    isLive: m.live_status !== "pre_match" && m.live_status !== "full_time",
    isFeatured: m.is_featured_broadcast,
    competitionName: m.competition?.name ?? null,
    round: m.round,
    matchDate: m.match_date,
    matchTime: m.match_time,
    homeTeam: { name: m.home_team.name, logoUrl: m.home_team.logo_url },
    awayTeam: { name: m.away_team.name, logoUrl: m.away_team.logo_url },
    homeScore: m.home_score,
    awayScore: m.away_score,
    liveStatus: m.live_status,
  };
}

export async function getPublicStreamingHub(): Promise<PublicStreamingHub> {
  const supabase = supabaseAdmin();

  const { data } = await supabase
    .from("matches")
    .select(
      `id, round, match_date, match_time, home_score, away_score, live_status, stream_url, is_featured_broadcast,
       competition:competitions(name),
       home_team:teams!matches_home_team_id_fkey(name, logo_url),
       away_team:teams!matches_away_team_id_fkey(name, logo_url)`
    )
    .not("stream_url", "is", null)
    .order("match_date", { ascending: true })
    .order("match_time", { ascending: true });

  const broadcasts = ((data ?? []) as unknown as StreamMatchRow[])
    .filter((m) => m.home_team && m.away_team && m.stream_url)
    .map(toPublicBroadcast);

  const live = broadcasts.filter((b) => b.isLive);
  const upcoming = broadcasts.filter((b) => b.liveStatus === "pre_match").slice(0, 10);
  const replays = broadcasts
    .filter((b) => b.liveStatus === "full_time")
    .sort((a, b) => (a.matchDate === b.matchDate ? b.matchTime.localeCompare(a.matchTime) : b.matchDate.localeCompare(a.matchDate)))
    .slice(0, 10);
  const featured = broadcasts
    .filter((b) => b.isFeatured)
    .sort((a, b) => (a.matchDate === b.matchDate ? b.matchTime.localeCompare(a.matchTime) : b.matchDate.localeCompare(a.matchDate)));

  return { live, upcoming, replays, featured };
}
