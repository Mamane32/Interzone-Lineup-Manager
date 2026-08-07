import "server-only";
import { getPublicScoresFeed, type PublicScoreMatch } from "@/lib/public-scores";
import { formatMatchDate } from "@/lib/utils";
import type { CrossPlatformItem } from "@/components/goodgrafik/cross-platform";

/**
 * Read model for the GoodGrafik master home's "This Week" and "Trending
 * Now" rails — the only place on the master home that touches real data.
 * Sports is real (getPublicScoresFeed, the same feed GGScoreLive itself
 * runs on); Culture/News/Studio have no backend yet, so their items are
 * fixed, clearly-labeled demo placeholders (isDemo: true) rather than
 * anything presented as a real production record — per the brief, real-
 * sounding artist/show names are deliberately avoided here.
 */

function toSportsItem(match: PublicScoreMatch): CrossPlatformItem {
  return {
    id: `sports-${match.matchId}`,
    world: "sports",
    title: `${match.homeTeam.name} vs ${match.awayTeam.name}`,
    subtitle: match.competitionName ?? "GGScoreLive",
    meta: match.isLive ? `Live · ${match.homeScore}–${match.awayScore}` : formatMatchDate(match.matchDate, match.matchTime),
    href: `/match/${match.matchId}`,
    isDemo: false,
    isLive: match.isLive,
  };
}

const DEMO_CULTURE: CrossPlatformItem = {
  id: "culture-demo-1",
  world: "culture",
  title: "Weekend concert preview",
  subtitle: "Culture · Live music",
  meta: "This weekend",
  href: "/culture/events",
  isDemo: true,
};

const DEMO_NEWS: CrossPlatformItem = {
  id: "news-demo-1",
  world: "news",
  title: "Top story preview",
  subtitle: "News · Editorial desk",
  meta: "Coming soon",
  href: "/news",
  isDemo: true,
};

const DEMO_STUDIO: CrossPlatformItem = {
  id: "studio-demo-1",
  world: "studio",
  title: "Podcast episode preview",
  subtitle: "Studio · Original show",
  meta: "New episodes soon",
  href: "/studio/podcasts",
  isDemo: true,
};

const DEMO_TRENDING: CrossPlatformItem[] = [
  { id: "culture-demo-2", world: "culture", title: "Artist spotlight preview", subtitle: "Culture · Interview", meta: "Coming soon", href: "/culture/interviews", isDemo: true },
  { id: "studio-demo-2", world: "studio", title: "Live show preview", subtitle: "Studio · Livestream", meta: "Coming soon", href: "/studio/live", isDemo: true },
];

export async function getThisWeek(): Promise<CrossPlatformItem[]> {
  const feed = await getPublicScoresFeed();
  const sportsMatch = feed.live[0] ?? feed.today[0] ?? feed.next[0];
  const items: CrossPlatformItem[] = [];
  if (sportsMatch) items.push(toSportsItem(sportsMatch));
  items.push(DEMO_CULTURE, DEMO_STUDIO, DEMO_NEWS);
  return items;
}

export async function getTrendingNow(): Promise<CrossPlatformItem[]> {
  const feed = await getPublicScoresFeed();
  const sportsMatches = [...feed.live, ...feed.today, ...feed.next].slice(0, 2).map(toSportsItem);
  return [...sportsMatches, ...DEMO_TRENDING];
}
