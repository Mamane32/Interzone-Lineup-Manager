import type { ReservedSection } from "./ReservedSectionNav";

/**
 * Reserved information architecture for each not-yet-built world — locks
 * in the route shell (app/(goodgrafik)/{world}/[section]) now, per the
 * brief, so later sprints build content into an existing structure
 * instead of redesigning the master platform's navigation. `key` is a
 * literal URL path segment (app/(goodgrafik)/{world}/[section]/page.tsx
 * matches it against this list) — it stays in plain ASCII regardless of
 * display language; only `label`/`description` (what a visitor reads)
 * are Kreyòl.
 */

export const CULTURE_SECTIONS: ReservedSection[] = [
  { key: "artists", label: "Atis", description: "Pwofil atis solo — byografi, mizik, sòti, videyo, atik ki gen rapò ak evènman." },
  { key: "bands", label: "Gwoup / Bann", description: "Pwofil gwoup ak bann — manm ak mizisyen ak foto, disko, videyo ak istwa tounen." },
  { key: "events", label: "Evènman", description: "Konsè ak festival — pèfòmans an dirèk k ap vini ak sa ki deja pase pou chak atis ak gwoup." },
  { key: "music", label: "Mizik", description: "Mizik, album ak sòti pou chak atis ak gwoup sou platfòm nan." },
  { key: "videos", label: "Videyo", description: "Videyo mizik, videyo pèfòmans an dirèk ak kontni dèyè sèn." },
  { key: "interviews", label: "Entèvyou", description: "Entèvyou ak repòtaj sou atis ak gwoup." },
  { key: "articles", label: "Atik / Nouvèl", description: "Jounalis kilti — sòti, anons tounen ak kouvèti endistri a." },
];

export const NEWS_SECTIONS: ReservedSection[] = [
  { key: "breaking", label: "Nouvèl Cho", description: "Istwa ijan pandan y ap devlope." },
  { key: "sports", label: "Sports", description: "Kouvèti nouvèl nan mond Sports la — diferan de pwòp News Center GGScoreLive pou jou match yo." },
  { key: "culture", label: "Culture", description: "Kouvèti nouvèl nan mond Culture la — sòti, tounen ak istwa endistri." },
  { key: "politics", label: "Politik", description: "Kouvèti ak analiz politik." },
  { key: "economy", label: "Ekonomi", description: "Kouvèti biznis ak ekonomi." },
  { key: "world", label: "Mondyal", description: "Kouvèti zafè entènasyonal ak aktyalite." },
];

export const STUDIO_SECTIONS: ReservedSection[] = [
  { key: "shows", label: "Emisyon", description: "Pwodiksyon orijinal GoodGrafik ak pwogram sou demand." },
  { key: "podcasts", label: "Podcast", description: "Seri ak episòd podcast odyo." },
  { key: "live", label: "An Dirèk", description: "Pwodiksyon an dirèk ak livestream." },
  { key: "radio", label: "Radyo", description: "Estasyon radyo/odyo GoodGrafik la." },
  { key: "videos", label: "Videyo", description: "Kontni videyo Studio ak achiv." },
  { key: "schedule", label: "Orè", description: "Pwogramasyon Studio k ap vini." },
];
