/**
 * The generalized branding inheritance chain:
 *
 *   Platform Branding
 *         ↓
 *   Competition Branding
 *         ↓
 *   Future Team Branding (optional, not implemented in Sprint 3)
 *         ↓
 *   Future Match/Event Branding (optional, not implemented in Sprint 3)
 *
 * Each level inherits every field from the level above it unless it sets
 * its own non-null value for that field. This module is the *one* place
 * that walks the chain — lib/branding.ts's resolveEffectiveBranding()
 * calls resolveBrandingChain() rather than re-implementing "later layer
 * wins if non-null" itself, so a Team or Match layer can be added later
 * by (a) adding one more entry to the `layers` array a caller builds and
 * (b) nothing else — this resolver's logic does not change.
 *
 * Sprint 3 only ever populates the platform and competition layers ("team"
 * and "match" have no schema, no Server Actions, and no UI yet — see
 * FutureTeamBrandingLayer / FutureMatchBrandingLayer below, kept here only
 * as a typed reservation of the shape so Sprint 4 doesn't have to touch
 * this resolver to add them).
 */

export type BrandingLevel = "platform" | "competition" | "team" | "match";

export interface BrandingOverrideLayer {
  level: BrandingLevel;
  /** Sparse — only the fields this level actually overrides. null/undefined/"" means "inherit from the level above," never "clear to blank." */
  values: Partial<Record<string, string | number | boolean | null | undefined>>;
}

export interface ResolvedBranding {
  values: Record<string, string | number | boolean>;
  /** Which level each resolved field ultimately came from — lets a UI show "Inherited from Platform" vs. "Overridden here," which the Brand Studio's Level 2 screen uses to distinguish an explicit competition override from an inherited platform value. */
  sourceByField: Record<string, BrandingLevel>;
}

/**
 * Walks `base` (the platform level's resolved values) through each layer
 * in order, applying an override only where a layer supplies a real
 * (non-null, non-empty) value. Pure function — never mutates `base` or
 * any layer, so the multi-tenant isolation guarantee (a competition's
 * override can never leak into another competition or into platform
 * branding) holds structurally: this function only ever reads its inputs
 * and returns a new object.
 */
export function resolveBrandingChain(base: Record<string, string | number | boolean>, layers: BrandingOverrideLayer[]): ResolvedBranding {
  const values: Record<string, string | number | boolean> = { ...base };
  const sourceByField: Record<string, BrandingLevel> = {};
  for (const key of Object.keys(base)) sourceByField[key] = "platform";

  for (const layer of layers) {
    for (const [key, value] of Object.entries(layer.values)) {
      if (value === null || value === undefined || value === "") continue;
      values[key] = value;
      sourceByField[key] = layer.level;
    }
  }

  return { values, sourceByField };
}

// ============================================================================
// FUTURE — reserved shapes only. No schema, no Server Action, no UI reads
// or writes these in Sprint 3. Documented here so adding either level
// later is additive (new migration + new layer-builder function that
// feeds resolveBrandingChain), not a redesign of the inheritance model.
// ============================================================================

/** Reserved for a future "a team can re-skin their own roster/coach-portal pages" feature. Not implemented. */
export interface FutureTeamBrandingLayer {
  level: "team";
  teamId: string;
  values: Partial<{ logoUrl: string; themeColor: string }>;
}

/** Reserved for a future "a single high-profile match gets its own one-off graphics package" feature (e.g. a final, an all-star game). Not implemented. */
export interface FutureMatchBrandingLayer {
  level: "match";
  matchId: string;
  values: Partial<{ watermarkUrl: string; sponsorLogoUrl: string }>;
}
