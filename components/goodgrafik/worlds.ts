import { Clapperboard, Music4, Newspaper, Trophy, type LucideIcon } from "lucide-react";

/**
 * The four GoodGrafik worlds — the master platform's top-level product
 * areas (see the approved master architecture brief). Sports is the only
 * one with a real backend today (GGSP/GGScoreLive, linked via `href`);
 * Culture/News/Studio get a reserved route shell and an "In Production"
 * state until their own sprints build them out — see
 * app/(goodgrafik)/{culture,news,studio}. This file is the single source
 * of truth for each world's identity (name, accent, icon) so the master
 * home, the header, and the bottom nav never drift out of sync.
 */

export type WorldId = "sports" | "culture" | "news" | "studio";

export type World = {
  id: WorldId;
  name: string;
  tagline: string;
  description: string;
  href: string;
  icon: LucideIcon;
  /** Tailwind color stem (e.g. "brand", "violet") — used as `text-{accent}-400`, `bg-{accent}-400`, etc. Sports reuses the platform's own brand gold, since it's already GGScoreLive's established identity; Culture/News/Studio get their own accent so all four still read as distinct worlds under one master brand. */
  accent: string;
  live: boolean;
};

export const WORLDS: World[] = [
  {
    id: "sports",
    name: "Sports",
    tagline: "Live football, every matchday.",
    description: "Live matches, competitions, scores, standings and broadcasts.",
    href: "/sports",
    icon: Trophy,
    accent: "brand",
    live: true,
  },
  {
    id: "culture",
    name: "Culture",
    tagline: "Music, artists, and the stages behind them.",
    description: "Artists, bands, concerts, festivals, interviews and entertainment.",
    href: "/culture",
    icon: Music4,
    accent: "violet",
    live: false,
  },
  {
    id: "news",
    name: "News",
    tagline: "What's happening, as it happens.",
    description: "Breaking news, sports, culture, politics, economy and world affairs.",
    href: "/news",
    icon: Newspaper,
    accent: "sky",
    live: false,
  },
  {
    id: "studio",
    name: "Studio",
    tagline: "Shows, podcasts, and original productions.",
    description: "Productions, shows, podcasts, radio, livestreams and video content.",
    href: "/studio",
    icon: Clapperboard,
    accent: "orange",
    live: false,
  },
];

export const HOME_NAV: { label: string; href: string }[] = [{ label: "Home", href: "/" }, ...WORLDS.map((w) => ({ label: w.name, href: w.href }))];

/**
 * Every class name below is written out in full, on purpose — Tailwind's
 * JIT scanner only picks up literal class strings it can find in source,
 * so a template-built class like `text-${accent}-400` would silently
 * produce no CSS at all. This lookup is what makes `world.accent` (a
 * plain string) safe to use for styling.
 */
export const ACCENT_CLASSES: Record<string, { text: string; bg: string; border: string; bgSoft: string; glow: string }> = {
  brand: { text: "text-brand-400", bg: "bg-brand-400", border: "border-brand-400/25", bgSoft: "bg-brand-400/10", glow: "bg-brand-400/20" },
  violet: { text: "text-violet-400", bg: "bg-violet-400", border: "border-violet-400/25", bgSoft: "bg-violet-400/10", glow: "bg-violet-400/20" },
  sky: { text: "text-sky-400", bg: "bg-sky-400", border: "border-sky-400/25", bgSoft: "bg-sky-400/10", glow: "bg-sky-400/20" },
  orange: { text: "text-orange-400", bg: "bg-orange-400", border: "border-orange-400/25", bgSoft: "bg-orange-400/10", glow: "bg-orange-400/20" },
};
