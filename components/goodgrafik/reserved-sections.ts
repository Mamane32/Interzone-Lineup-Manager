import type { ReservedSection } from "./ReservedSectionNav";

/** Reserved information architecture for each not-yet-built world — locks in the route shell (app/(goodgrafik)/{world}/[section]) now, per the brief, so later sprints build content into an existing structure instead of redesigning the master platform's navigation. */

export const CULTURE_SECTIONS: ReservedSection[] = [
  { key: "artists", label: "Artists", description: "Solo artist profiles — biography, music, releases, videos, related articles and events." },
  { key: "bands", label: "Bands / Groups", description: "Band and group profiles — members and musicians with photos, discography, videos and tour history." },
  { key: "events", label: "Events", description: "Concerts and festivals — upcoming and past live performances across every artist and band." },
  { key: "music", label: "Music", description: "Tracks, albums and releases from every artist and band on the platform." },
  { key: "videos", label: "Videos", description: "Music videos, live performance footage and behind-the-scenes content." },
  { key: "interviews", label: "Interviews", description: "Artist and band interviews and features." },
  { key: "articles", label: "Articles / News", description: "Culture journalism — releases, tour announcements and industry coverage." },
];

export const NEWS_SECTIONS: ReservedSection[] = [
  { key: "breaking", label: "Breaking News", description: "Time-sensitive stories as they develop." },
  { key: "sports", label: "Sports", description: "News coverage from the Sports world — distinct from GGScoreLive's own match-day News Center." },
  { key: "culture", label: "Culture", description: "News coverage from the Culture world — releases, tours and industry stories." },
  { key: "politics", label: "Politics", description: "Political coverage and analysis." },
  { key: "economy", label: "Economy", description: "Business and economic coverage." },
  { key: "world", label: "World", description: "International and current affairs coverage." },
];

export const STUDIO_SECTIONS: ReservedSection[] = [
  { key: "shows", label: "Shows", description: "Original GoodGrafik productions and on-demand programs." },
  { key: "podcasts", label: "Podcasts", description: "Audio podcast series and episodes." },
  { key: "live", label: "Live", description: "Live productions and livestreams." },
  { key: "radio", label: "Radio", description: "The GoodGrafik radio/audio stream." },
  { key: "videos", label: "Videos", description: "Studio video content and archives." },
  { key: "schedule", label: "Schedule", description: "Upcoming Studio programming." },
];
