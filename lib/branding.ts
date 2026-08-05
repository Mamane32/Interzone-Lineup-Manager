import "server-only";
import { supabaseAdmin } from "@/lib/supabase-admin";
import { LEVEL_1_TOKENS, LEVEL_2_TOKENS, CSS_VAR_TOKENS } from "@/lib/theme-tokens";
import { hexToRgbTriplet } from "@/lib/color-utils";
import { resolveBrandingChain, type BrandingOverrideLayer } from "@/lib/branding-inheritance";

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
 * 1. Platform branding — GoodGrafik itself: logo, name, subtitle, the
 *    two theme colors. Editable at /admin/settings (Platform branding
 *    section) by a super_admin, backed by the `platform_branding`
 *    singleton table (migration 022) — no code deploy required to
 *    rename the platform or swap its logo.
 * 2. Competition / organization branding — who a specific broadcast is
 *    *for* (layered on top of #1 via withCompetition, below).
 * 3. Production partner branding — who's *producing* it, if applicable
 *    (e.g. Media Tout Kote is a production partner, not the platform
 *    owner — a different competition using this same software might have
 *    no production partner, or a different one).
 * 4. Permanent technology attribution — "Powered by GoodGrafik". This
 *    line never changes and is never removed, regardless of the tiers
 *    above.
 *
 * ----------------------------------------------------------------------
 * White-Label Branding System (Sprint 3) additions:
 *
 * Everything above this comment predates Sprint 3 and is unchanged —
 * BrandingConfiguration/getBaseBranding/withCompetition keep their exact
 * existing shape and behavior so nothing that already imports them
 * breaks. PlatformBranding is *extended* (new fields), never narrowed.
 *
 * New in Sprint 3: the general N-level inheritance model from
 * lib/branding-inheritance.ts, applied here for the two levels that
 * actually exist today (Platform, Competition):
 *   - PlatformBranding now carries every Level 1 field (identity, brand
 *     assets, visual theme, typography, layout, behavior).
 *   - CompetitionBranding is the new Level 2 shape (competitions.* plus
 *     the competition_sponsor_logos gallery), read via
 *     getCompetitionBranding(competitionId).
 *   - resolveEffectiveBranding(platform, competition) builds a
 *     BrandingOverrideLayer for the competition and calls
 *     resolveBrandingChain() rather than re-deriving "later layer wins if
 *     non-null" itself — the same resolver a future Team or Match layer
 *     will plug into without this function's logic changing. This
 *     function never mutates either input; a competition can never
 *     affect another competition or the platform (multi-tenant isolation
 *     guarantee).
 *   - platformBrandingToCssVars()/competitionBrandingToCssVars() turn
 *     either shape into the CSS custom property map a ThemeScope (Brand
 *     Studio live preview, and any real page that wraps itself in one)
 *     sets on its root element. Color tokens emit both a plain hex
 *     variable and an "-rgb" triplet sibling so Tailwind's opacity
 *     modifiers (bg-brand-400/25) keep working on branding-driven colors
 *     — see tailwind.config.ts.
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
 * is GoodGrafik itself called and branded as, right now," expanded in
 * Sprint 3 to the full Level 1 field set from lib/theme-tokens.ts.
 */
export interface PlatformBranding {
  // Identity (pre-Sprint-3 fields kept first, for callers pattern-matching on shape)
  organizationName: string;
  organizationSubtitle: string;
  organizationLogoUrl: string | null;
  primaryColor: string;
  secondaryColor: string;

  // Identity (Sprint 3)
  platformShortName: string;
  tagline: string;
  companyName: string;
  copyrightText: string;
  footerText: string;
  browserTitle: string;
  browserDescription: string;

  // Brand assets
  smallLogoUrl: string | null;
  headerLogoUrl: string | null;
  loginLogoUrl: string | null;
  loadingLogoUrl: string | null;
  splashScreenUrl: string | null;
  faviconUrl: string | null;
  browserIconUrl: string | null;
  placeholderLogoUrl: string | null;

  // Visual theme
  accentColor: string;
  successColor: string;
  warningColor: string;
  errorColor: string;
  backgroundColor: string;
  surfaceColor: string;
  navigationColor: string;
  headerColor: string;
  sidebarColor: string;
  buttonColor: string;
  linkColor: string;

  // Typography
  fontFamily: string;
  fontWeight: string;
  headingStyle: string;
  textStyle: string;

  // Layout
  logoSize: number;
  logoPadding: number;
  headerHeight: number;
  sidebarWidth: number;
  borderRadius: number;
  shadowStyle: string;
  cardStyle: string;

  // Behavior
  lightModeEnabled: boolean;
  darkModeEnabled: boolean;
  defaultTheme: string;
  animationLevel: string;
}

export const DEFAULT_PLATFORM_BRANDING: PlatformBranding = {
  organizationName: "GoodGrafik",
  organizationSubtitle: "Sports Platform",
  organizationLogoUrl: null,
  primaryColor: "#f5a623",
  secondaryColor: "#0d1117",

  platformShortName: "GGSP",
  tagline: "The Operating System for Football Competitions",
  companyName: "GoodGrafik",
  copyrightText: "© GoodGrafik. All rights reserved.",
  footerText: "Securely powered by GoodGrafik",
  browserTitle: "GoodGrafik Sports Platform",
  browserDescription: "Run every matchday from one command center.",

  smallLogoUrl: null,
  headerLogoUrl: null,
  loginLogoUrl: null,
  loadingLogoUrl: null,
  splashScreenUrl: null,
  faviconUrl: null,
  browserIconUrl: null,
  placeholderLogoUrl: null,

  accentColor: "#22c55e",
  successColor: "#22c55e",
  warningColor: "#eab308",
  errorColor: "#ef4444",
  backgroundColor: "#07090d",
  surfaceColor: "#111720",
  navigationColor: "#0d1117",
  headerColor: "#0d1117",
  sidebarColor: "#0d1117",
  buttonColor: "#f5a623",
  linkColor: "#f5a623",

  fontFamily: "Inter",
  fontWeight: "normal",
  headingStyle: "display",
  textStyle: "regular",

  logoSize: 40,
  logoPadding: 8,
  headerHeight: 64,
  sidebarWidth: 260,
  borderRadius: 16,
  shadowStyle: "soft",
  cardStyle: "glass",

  lightModeEnabled: false,
  darkModeEnabled: true,
  defaultTheme: "dark",
  animationLevel: "normal",
};

/** Maps a raw platform_branding DB row (snake_case) onto PlatformBranding (camelCase), falling back per-field to DEFAULT_PLATFORM_BRANDING — used by both getPlatformBranding() and the Brand Studio's "load current values" path. */
function rowToPlatformBranding(data: Record<string, unknown>): PlatformBranding {
  const d = DEFAULT_PLATFORM_BRANDING;
  const str = (v: unknown, fallback: string) => (typeof v === "string" && v.length > 0 ? v : fallback);
  const num = (v: unknown, fallback: number) => (typeof v === "number" ? v : fallback);
  const bool = (v: unknown, fallback: boolean) => (typeof v === "boolean" ? v : fallback);
  const nullableStr = (v: unknown) => (typeof v === "string" && v.length > 0 ? v : null);

  return {
    organizationName: str(data.organization_name, d.organizationName),
    organizationSubtitle: str(data.organization_subtitle, d.organizationSubtitle),
    organizationLogoUrl: nullableStr(data.organization_logo_url),
    primaryColor: str(data.primary_color, d.primaryColor),
    secondaryColor: str(data.secondary_color, d.secondaryColor),

    platformShortName: str(data.platform_short_name, d.platformShortName),
    tagline: str(data.tagline, d.tagline),
    companyName: str(data.company_name, d.companyName),
    copyrightText: str(data.copyright_text, d.copyrightText),
    footerText: str(data.footer_text, d.footerText),
    browserTitle: str(data.browser_title, d.browserTitle),
    browserDescription: str(data.browser_description, d.browserDescription),

    smallLogoUrl: nullableStr(data.small_logo_url),
    headerLogoUrl: nullableStr(data.header_logo_url),
    loginLogoUrl: nullableStr(data.login_logo_url),
    loadingLogoUrl: nullableStr(data.loading_logo_url),
    splashScreenUrl: nullableStr(data.splash_screen_url),
    faviconUrl: nullableStr(data.favicon_url),
    browserIconUrl: nullableStr(data.browser_icon_url),
    placeholderLogoUrl: nullableStr(data.placeholder_logo_url),

    accentColor: str(data.accent_color, d.accentColor),
    successColor: str(data.success_color, d.successColor),
    warningColor: str(data.warning_color, d.warningColor),
    errorColor: str(data.error_color, d.errorColor),
    backgroundColor: str(data.background_color, d.backgroundColor),
    surfaceColor: str(data.surface_color, d.surfaceColor),
    navigationColor: str(data.navigation_color, d.navigationColor),
    headerColor: str(data.header_color, d.headerColor),
    sidebarColor: str(data.sidebar_color, d.sidebarColor),
    buttonColor: str(data.button_color, d.buttonColor),
    linkColor: str(data.link_color, d.linkColor),

    fontFamily: str(data.font_family, d.fontFamily),
    fontWeight: str(data.font_weight, d.fontWeight),
    headingStyle: str(data.heading_style, d.headingStyle),
    textStyle: str(data.text_style, d.textStyle),

    logoSize: num(data.logo_size as number, d.logoSize),
    logoPadding: num(data.logo_padding as number, d.logoPadding),
    headerHeight: num(data.header_height as number, d.headerHeight),
    sidebarWidth: num(data.sidebar_width as number, d.sidebarWidth),
    borderRadius: num(data.border_radius as number, d.borderRadius),
    shadowStyle: str(data.shadow_style, d.shadowStyle),
    cardStyle: str(data.card_style, d.cardStyle),

    lightModeEnabled: bool(data.light_mode_enabled as boolean, d.lightModeEnabled),
    darkModeEnabled: bool(data.dark_mode_enabled as boolean, d.darkModeEnabled),
    defaultTheme: str(data.default_theme, d.defaultTheme),
    animationLevel: str(data.animation_level, d.animationLevel),
  };
}

/**
 * Reads the one-row `platform_branding` table (migration 022, expanded by
 * 023) — the admin-editable source of truth for the platform's own
 * identity, as opposed to any specific competition's. Falls back to
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
    return rowToPlatformBranding(data as Record<string, unknown>);
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

// ============================================================================
// Sprint 3 — Level 2 (Competition) branding
// ============================================================================

export interface CompetitionSponsorLogo {
  id: string;
  logoUrl: string;
  sponsorName: string | null;
  sortOrder: number;
}

/** The competition's own Level 2 overrides — every field nullable, since "unset" means "inherit platform branding," not "blank." */
export interface CompetitionBranding {
  competitionId: string;
  name: string | null;
  shortName: string | null;
  seasonLabel: string | null;
  logoUrl: string | null;
  bannerUrl: string | null;
  themeColor: string | null;
  accentColor: string | null;
  backgroundImageUrl: string | null;
  introVideoUrl: string | null;
  watermarkUrl: string | null;
  sponsorLogos: CompetitionSponsorLogo[];
}

/**
 * Reads one competition's Level 2 branding overrides plus its sponsor
 * logo gallery (migration 024). Returns null fields for anything unset —
 * callers merge this with getPlatformBranding() via
 * resolveEffectiveBranding rather than treating a null here as an error.
 */
export async function getCompetitionBranding(competitionId: string): Promise<CompetitionBranding | null> {
  try {
    const admin = supabaseAdmin();
    const [{ data: competition, error }, { data: sponsors }] = await Promise.all([
      admin
        .from("competitions")
        .select("id, name, short_name, season_label, logo_url, banner_url, theme_color, accent_color, background_image_url, intro_video_url, watermark_url")
        .eq("id", competitionId)
        .maybeSingle(),
      admin
        .from("competition_sponsor_logos")
        .select("id, logo_url, sponsor_name, sort_order")
        .eq("competition_id", competitionId)
        .order("sort_order", { ascending: true }),
    ]);
    if (error || !competition) return null;

    return {
      competitionId,
      name: competition.name ?? null,
      shortName: competition.short_name ?? null,
      seasonLabel: competition.season_label ?? null,
      logoUrl: competition.logo_url ?? null,
      bannerUrl: competition.banner_url ?? null,
      themeColor: competition.theme_color ?? null,
      accentColor: competition.accent_color ?? null,
      backgroundImageUrl: competition.background_image_url ?? null,
      introVideoUrl: competition.intro_video_url ?? null,
      watermarkUrl: competition.watermark_url ?? null,
      sponsorLogos: ((sponsors ?? []) as { id: string; logo_url: string; sponsor_name: string | null; sort_order: number }[]).map((s) => ({
        id: s.id,
        logoUrl: s.logo_url,
        sponsorName: s.sponsor_name,
        sortOrder: s.sort_order,
      })),
    };
  } catch (err) {
    console.error("getCompetitionBranding failed", err);
    return null;
  }
}

export interface EffectiveBranding {
  platform: PlatformBranding;
  competition: CompetitionBranding | null;
  /** Resolved values a page should actually render: competition's non-null field, else the platform's. */
  organizationName: string;
  logoUrl: string | null;
  bannerUrl: string | null;
  primaryColor: string;
  accentColor: string;
  seasonLabel: string | null;
  sponsorLogos: CompetitionSponsorLogo[];
  backgroundImageUrl: string | null;
  introVideoUrl: string | null;
  watermarkUrl: string | null;
}

/**
 * Merges platform (Level 1) and competition (Level 2) branding for one
 * page's render, via lib/branding-inheritance.ts's generic chain
 * resolver rather than re-implementing "later layer wins if non-null"
 * here — the same resolver a future Team or Match layer plugs into
 * without this function's logic changing (see that module's doc
 * comment). Pure function, no I/O, no mutation of either input —
 * multi-tenant isolation is enforced simply by never writing back to
 * `platform` here and by `competition` only ever being one row's data.
 */
export function resolveEffectiveBranding(platform: PlatformBranding, competition: CompetitionBranding | null): EffectiveBranding {
  const base: Record<string, string | number | boolean> = {
    organizationName: platform.organizationName,
    logoUrl: platform.organizationLogoUrl ?? "",
    primaryColor: platform.primaryColor,
    accentColor: platform.accentColor,
  };

  const layers: BrandingOverrideLayer[] = competition
    ? [
        {
          level: "competition",
          values: {
            organizationName: competition.name ?? undefined,
            logoUrl: competition.logoUrl ?? undefined,
            primaryColor: competition.themeColor ?? undefined,
            accentColor: competition.accentColor ?? undefined,
          },
        },
      ]
    : [];

  const { values } = resolveBrandingChain(base, layers);

  return {
    platform,
    competition,
    organizationName: String(values.organizationName),
    logoUrl: (values.logoUrl as string) || null,
    bannerUrl: competition?.bannerUrl ?? null,
    primaryColor: String(values.primaryColor),
    accentColor: String(values.accentColor),
    seasonLabel: competition?.seasonLabel ?? null,
    sponsorLogos: competition?.sponsorLogos ?? [],
    backgroundImageUrl: competition?.backgroundImageUrl ?? null,
    introVideoUrl: competition?.introVideoUrl ?? null,
    watermarkUrl: competition?.watermarkUrl ?? null,
  };
}

// ============================================================================
// Sprint 3 — design tokens -> CSS custom properties
// ============================================================================

/**
 * All Level 1 CSS-var tokens, resolved against a PlatformBranding value.
 * Used to build the :root (or a scoped container's) style for the real,
 * saved platform theme. Color tokens emit both the plain hex variable
 * (`--ggsp-color-primary`) and an "-rgb" triplet sibling
 * (`--ggsp-color-primary-rgb`) — the triplet is what
 * tailwind.config.ts's opacity-modifier-safe color wiring reads.
 */
export function platformBrandingToCssVars(branding: PlatformBranding): Record<string, string> {
  const asRecord = branding as unknown as Record<string, unknown>;
  const vars: Record<string, string> = {};
  for (const token of LEVEL_1_TOKENS) {
    if (!token.cssVar) continue;
    const value = asRecord[token.id];
    if (value === null || value === undefined || value === "") continue;
    if (token.inputType === "color" && typeof value === "string") {
      vars[token.cssVar] = value;
      vars[`${token.cssVar}-rgb`] = hexToRgbTriplet(value);
    } else {
      vars[token.cssVar] = typeof value === "number" ? `${value}px` : String(value);
    }
  }
  return vars;
}

/** Level 2 CSS-var overrides for one competition, to layer on top of platformBrandingToCssVars() inside that competition's surfaces only. Same hex + "-rgb" triplet pairing as the platform serializer, for the same opacity-modifier reason. */
export function competitionBrandingToCssVars(branding: CompetitionBranding): Record<string, string> {
  const vars: Record<string, string> = {};
  const nonColor: Record<string, string | null> = {
    "--ggsp-comp-logo": branding.logoUrl,
    "--ggsp-comp-banner": branding.bannerUrl,
    "--ggsp-comp-background": branding.backgroundImageUrl,
    "--ggsp-comp-watermark": branding.watermarkUrl,
  };
  for (const [cssVar, value] of Object.entries(nonColor)) {
    if (value) vars[cssVar] = value;
  }

  const colors: Record<string, string | null> = {
    "--ggsp-color-primary": branding.themeColor,
    "--ggsp-color-accent": branding.accentColor,
  };
  for (const [cssVar, value] of Object.entries(colors)) {
    if (!value) continue;
    vars[cssVar] = value;
    vars[`${cssVar}-rgb`] = hexToRgbTriplet(value);
  }

  return vars;
}

export { LEVEL_1_TOKENS, LEVEL_2_TOKENS, CSS_VAR_TOKENS };
