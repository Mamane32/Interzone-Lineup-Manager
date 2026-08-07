import type { WorldId } from "./worlds";

/**
 * One card in the master home's "This Week" / "Trending Now" rails — the
 * one place all four worlds appear side by side. `isDemo` is not cosmetic:
 * per the master platform brief, Culture/News/Studio have no real content
 * source yet, so every item from those worlds is built from
 * DEMO_CULTURE/DEMO_NEWS/DEMO_STUDIO below and always carries isDemo:true,
 * which CrossPlatformCard renders as a visible "Demo preview" tag. Sports
 * items come from the real getPublicScoresFeed() (lib/public-scores.ts)
 * and are never marked demo.
 */
export type CrossPlatformItem = {
  id: string;
  world: WorldId;
  title: string;
  subtitle: string;
  meta: string;
  href: string;
  isDemo: boolean;
  isLive?: boolean;
};
