/**
 * Branding configuration for the platform's public-facing surfaces —
 * originally built for the Broadcast Control Center (app/live/**,
 * components/live/**) and now also the source of truth for the unified
 * login (app/login/**). This module is built to be reused by more than one
 * organization (Interzone, Media Tout Kote, other competitions/
 * federations/leagues), so nothing about a specific organization is
 * hardcoded into components; everything reads from here.
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
 * Layers a specific match's competition — and, through it, the real
 * organization that owns the competition (the "League" tier: e.g. "League
 * Football de Port-de-Paix (LFP)" owning the "Interzone" competition) —
 * onto the base branding. Both `organizations.logo_url` and
 * `competitions.logo_url` are real columns (migration 006); this is what
 * actually reads them, rather than the League/Competition tiers only ever
 * coming from env vars. Components should call this rather than reading
 * env vars or Supabase rows directly.
 */
export function withCompetition(
  base: BrandingConfiguration,
  competition:
    | {
        name: string | null | undefined;
        logo_url?: string | null;
        organization?: { name: string | null | undefined; logo_url: string | null } | null;
      }
    | null
    | undefined
): BrandingConfiguration {
  return {
    ...base,
    competitionName: competition?.name ?? null,
    competitionLogoUrl: competition?.logo_url ?? null,
    // The competition's real owning organization ("League") outranks the
    // env-var fallback organization identity once a match actually belongs
    // to one — env vars remain the fallback for pages with no competition
    // context (e.g. the unified login).
    organizationName: competition?.organization?.name || base.organizationName,
    organizationLogoUrl: competition?.organization?.logo_url ?? base.organizationLogoUrl,
  };
}
