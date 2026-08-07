"use server";

import { searchPublicMatches, type PublicScoreMatch } from "@/lib/public-scores";

/**
 * The one Server Action GGScoreLive's public pages need — search runs from
 * a client component (ScoresSearch.tsx) as the admin/coach types, so it
 * can't call lib/public-scores.ts's `"server-only"` searchPublicMatches
 * directly the way every server-rendered page here does. No auth gate:
 * this is the same public, anonymous-safe data every other GGScoreLive
 * page already renders, just reachable via a client round-trip instead of
 * a page load.
 */
export async function searchMatchesAction(query: string, competitionId?: string): Promise<PublicScoreMatch[]> {
  return searchPublicMatches(query, competitionId);
}
