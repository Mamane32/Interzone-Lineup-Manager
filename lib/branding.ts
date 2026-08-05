import "server-only";
import { supabaseAdmin } from "@/lib/supabase-admin";

/**
 * Branding configuration for the platform's public-facing surfaces —
 * originally built for the Broadcast Control Center (app/live/**,
 * components/live/**) and now also the source of truth for the unified
 * login (app/login/**), the admin/coach shell header, and the GG header
 * inside the Broadcast Control Center itself. This module is built to be
 * reused by more than one organization (Interzone, Media Tout Kote, other
 * competitions/federations/leagues), so nothing about a specific
 * organization is hardcoded into components; everything reads from here.
 *
 * Hierarchy (per the brief):
 *   1. Platform branding — GoodGrafik itself: logo, name, subtitle, the
 *      two theme colors. Editable at /admin/settings (Platform branding
 *      section) by a super_admin, backed by the `platform_branding`
 *      singleton table (migration 022) — no code deploy required to
 *      rename the platform or swap its logo.
 *   2. Competition / organization branding — who a specific broadcast is
 *      *for* (layered on top of #1 via withCompetition, below).
 *   3. Production partner branding — who's *producing* it, if applicable
 *      (e.g. Media Tout Kote is a production partner, not the platform
 *      owner — a different competition using this same software might have
 *      no production partner, or a different one).
 *   4. Permanent technology attribution — "Powered by GoodGrafik". This
 *      line never changes and is never removed, regardless of the tiers
 *      above.
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

/**
 * The platform_branding row, shaped for direct use by any header/brand
 * mark component — distinct from BrandingConfiguration above, which is
 * the broadcast-specific, competition-layered shape. This is just "what
 * is GoodGrafik itself called and branded as, right now."
 */
export interface PlatformBranding {
  organizationName: string;
  organizationSubtitle: string;
  organizationLogoUrl: string | null;
  primaryColor: string;
  secondaryColor: string;
}

export const DEFAULT_PLATFORM_BRANDING: PlatformBranding = {
  organizationName: "GoodGrafik",
  organizationSubtitle: "Sports Platform",
  organizationLogoUrl: null,
  primaryColor: "#f5a623",
  secondaryColor: "#0d1117",
};

/**
 * Reads the one-row `platform_branding` table (migration 022) — the
 * admin-editable source of truth for the platform's own identity, as
 * opposed to any specific competition's. Falls back to
 * DEFAULT_PLATFORM_BRANDING (the same strings BrandMark.tsx used to have
 * hardcoded) if the table is empty or the query fails for any reason —
 * the header must never render blank just because this lookup had a bad
 * moment.
 */
export async function getPlatformBranding(): Promise<PlatformBranding> {
  try {
    const admin = supabaseAdmin();
    const { data, error } = await admin.from("platform_branding").select("*").eq("id", true).maybeSingle();
    if (error || !data) return DEFAULT_PLATFORM_BRANDING;
    return {
      organizationName: data.organization_name || DEFAULT_PLATFORM_BRANDING.organizationName,
      organizationSubtitle: data.organization_subtitle || DEFAULT_PLATFORM_BRANDING.organizationSubtitle,
      organizationLogoUrl: data.organization_logo_url ?? null,
      primaryColor: data.primary_color || DEFAULT_PLATFORM_BRANDING.primaryColor,
      secondaryColor: data.secondary_color || DEFAULT_PLATFORM_BRANDING.secondaryColor,
    };
  } catch (err) {
    console.error("getPlatformBranding failed, using defaults", err);
    return DEFAULT_PLATFORM_BRANDING;
  }
}

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
 * The same shape as getBaseBranding(), but sourced from the admin-editable
 * platform_branding table (via getPlatformBranding()) instead of env vars
 * — this is what every page should call now. Env vars remain the deeper
 * fallback layer (getPlatformBranding already falls back to
 * DEFAULT_PLATFORM_BRANDING, not to these — the env vars are a separate,
 * older knob for seasonName/productionPartner, which have no admin UI
 * yet, so they're layered on top here rather than replaced).
 */
export async function getBaseBrandingAsync(): Promise<BrandingConfiguration> {
  const platform = await getPlatformBranding();
  const base = getBaseBranding();
  return {
    ...base,
    organizationName: platform.organizationName,
    organizationLogoUrl: platform.organizationLogoUrl,
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
