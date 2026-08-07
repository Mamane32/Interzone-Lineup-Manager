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

/** Display order and accent colors match the approved reference mockups (Sports/Culture/Studio/News, orange-gold/violet/blue/rose) — not the original brief's plain listing order, which the mockups supersede for UI purposes. */
export const WORLDS: World[] = [
  {
    id: "sports",
    name: "Sports",
    tagline: "Match an dirèk, klasman, difizyon ak konpetisyon.",
    description: "Match an dirèk, konpetisyon, eskò, klasman ak difizyon.",
    href: "/sports",
    icon: Trophy,
    accent: "brand",
    live: true,
  },
  {
    id: "culture",
    name: "Culture",
    tagline: "Mizik, konsè, atis ak festival.",
    description: "Atis, gwoup mizik, konsè, festival, entèvyou ak amizman.",
    href: "/culture",
    icon: Music4,
    accent: "violet",
    live: false,
  },
  {
    id: "studio",
    name: "Studio",
    tagline: "Pwodiksyon, podcast, radyo, livestream.",
    description: "Pwodiksyon, emisyon, podcast, radyo, livestream ak videyo.",
    href: "/studio",
    icon: Clapperboard,
    accent: "blue",
    live: false,
  },
  {
    id: "news",
    name: "News",
    tagline: "Nouvèl cho, espò, kilti epi plis ankò.",
    description: "Nouvèl cho, espò, kilti, politik, ekonomi ak zafè mondyal.",
    href: "/news",
    icon: Newspaper,
    accent: "rose",
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
export const ACCENT_CLASSES: Record<string, { text: string; bg: string; border: string; bgSoft: string; glow: string; hoverBg: string }> = {
  brand: { text: "text-brand-400", bg: "bg-brand-400", border: "border-brand-400/40", bgSoft: "bg-brand-400/10", glow: "bg-brand-400/25", hoverBg: "hover:bg-brand-400" },
  violet: { text: "text-violet-400", bg: "bg-violet-400", border: "border-violet-400/40", bgSoft: "bg-violet-400/10", glow: "bg-violet-400/25", hoverBg: "hover:bg-violet-400" },
  blue: { text: "text-blue-400", bg: "bg-blue-400", border: "border-blue-400/40", bgSoft: "bg-blue-400/10", glow: "bg-blue-400/25", hoverBg: "hover:bg-blue-400" },
  rose: { text: "text-rose-400", bg: "bg-rose-400", border: "border-rose-400/40", bgSoft: "bg-rose-400/10", glow: "bg-rose-400/25", hoverBg: "hover:bg-rose-400" },
};
