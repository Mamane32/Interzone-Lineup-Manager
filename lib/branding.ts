/**
 * Branding configuration for the Broadcast Control Center (app/live/**,
 * components/live/**) — nowhere else. This module is built to be reused by
 * more than one organization (Interzone, Media Tout Kote, other
 * competitions/federations/leagues), so nothing about a specific
 * organization is hardcoded into components; everything reads from here.
 *
 * Hierarchy (per the brief):
 *   1. Competition / organization branding — who this broadcast is *for*.
 *   2. Production partner branding — who's *producing* it, if applicable
 *      (e.g. Media Tout Kote is a production partner, not the platform
 *      owner — a different competition using this same software might have
 *      no production partner, or a different one).
 *   3. Permanent technology attribution — "Powered by GoodGrafik". This
 *      line never changes and is never removed, regardless of the two
 *      tiers above.
 *
 * Today this reads from environment variables with sensible fallbacks
 * (there's no branding table — adding one would be a schema change this
 * sprint explicitly avoids). A future sprint could move tiers 1-2 into
 * Supabase (e.g. a `competitions.branding` jsonb column) without touching
 * any component here — they all read `BrandingConfiguration`, not env vars
 * directly.
 */
export interface BrandingConfiguration {
  organizationName: string;
  organizationLogoUrl: string | null;
  competitionName: string | null;
  competitionLogoUrl: string | null;
  seasonName: string | null;
  productionPartnerName: string | null;
  productionPartnerLogoUrl: string | null;
  /** Permanent — always "GoodGrafik", never configurable, never hidden. */
  poweredByName: "GoodGrafik";
}

const FALLBACK_ORG_NAME = "Broadcast Control Center";

export function getBaseBranding(): BrandingConfiguration {
  return {
    organizationName: process.env.NEXT_PUBLIC_BROADCAST_ORG_NAME || FALLBACK_ORG_NAME,
    organizationLogoUrl: process.env.NEXT_PUBLIC_BROADCAST_ORG_LOGO_URL || null,
    competitionName: null,
    competitionLogoUrl: null,
    seasonName: process.env.NEXT_PUBLIC_BROADCAST_SEASON_NAME || null,
    productionPartnerName: process.env.NEXT_PUBLIC_BROADCAST_PARTNER_NAME || null,
    productionPartnerLogoUrl: process.env.NEXT_PUBLIC_BROADCAST_PARTNER_LOGO_URL || null,
    poweredByName: "GoodGrafik",
  };
}

/**
 * Layers a specific match's competition (real Supabase data - name only
 * today; competitions has no logo column, see SPRINT_1_COACH_PORTAL.md)
 * onto the base org/partner branding. Components should call this rather
 * than reading env vars themselves.
 */
export function withCompetition(
  base: BrandingConfiguration,
  competition: { name: string | null | undefined } | null | undefined
): BrandingConfiguration {
  return {
    ...base,
    competitionName: competition?.name ?? null,
  };
}
