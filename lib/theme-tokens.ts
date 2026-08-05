/**
 * GGSP White-Label Branding — canonical design token registry.
 *
 * This is the single list every themeable value in the platform is
 * declared in exactly once: its storage column, its CSS custom property
 * name, its default, which "level" (see lib/branding-permissions.ts) is
 * allowed to set it, and which Brand Studio section it's edited in. Only
 * one grouping — `studioSection` — is presentational; `category` is the
 * data-model grouping used by the two-level permission/schema split.
 * Nothing else in the app should invent a token name or a CSS variable ad
 * hoc — the Brand Studio's controls, the live preview's ThemeScope, the
 * DB read/write mapping in lib/branding.ts, and the JSON export/import in
 * Theme Presets all walk this same list, so a new brandable field is
 * added in exactly one place.
 *
 * Level 1 = Platform Owner / Super Admin only (platform_branding table).
 * Level 2 = Competition Administrator, scoped to their own competition
 * (competitions table columns + competition_sponsor_logos).
 * Level 2 tokens are a deliberate subset — a competition can
 * only override identity/logo/color/media fields, never
 * typography, layout, or behavior, which stay platform-wide.
 */

export type TokenCategory =
  | "identity"
  | "brand-assets"
  | "visual-theme"
  | "typography"
  | "layout"
  | "behavior"
  | "competition-identity"
  | "competition-assets"
  | "competition-theme"
  | "competition-media";

export type TokenInputType = "text" | "textarea" | "color" | "image" | "select" | "number" | "toggle";

/** The Brand Studio's left-panel section IDs, in display order. "preview" has no tokens — it's the right-panel live preview itself, listed here only so the Studio's section list and its section-order are both driven by this one array. */
export type StudioSection =
  | "identity"
  | "logos-assets"
  | "colors"
  | "typography"
  | "layout"
  | "components"
  | "navigation"
  | "motion"
  | "preview";

export const STUDIO_SECTIONS: { id: StudioSection; label: string }[] = [
  { id: "identity", label: "Identity" },
  { id: "logos-assets", label: "Logos & Assets" },
  { id: "colors", label: "Colors" },
  { id: "typography", label: "Typography" },
  { id: "layout", label: "Layout" },
  { id: "components", label: "Components" },
  { id: "navigation", label: "Navigation" },
  { id: "motion", label: "Motion" },
  { id: "preview", label: "Preview" },
];

export interface ThemeToken {
  /** Stable id used in JSON export/import and preset storage. */
  id: string;
  label: string;
  category: TokenCategory;
  /** Which Brand Studio left-panel section edits this token. Purely presentational — never affects storage or permissions. */
  studioSection: StudioSection;
  level: 1 | 2;
  /** Column name in platform_branding (level 1) or competitions / competition_sponsor_logos (level 2). */
  column: string;
  /** CSS custom property this token is exposed as inside a ThemeScope. Null for tokens with no visual CSS representation (e.g. browser title). Color tokens also get a `${cssVar}-rgb` sibling variable (see lib/branding.ts) for Tailwind opacity-modifier support. */
  cssVar: string | null;
  inputType: TokenInputType;
  default: string | number | boolean | null;
  options?: string[];
  helperText?: string;
}

export const LEVEL_1_IDENTITY_TOKENS: ThemeToken[] = [
  { id: "platformName", label: "Platform Name", category: "identity", studioSection: "identity", level: 1, column: "organization_name", cssVar: null, inputType: "text", default: "GoodGrafik" },
  { id: "platformShortName", label: "Platform Short Name", category: "identity", studioSection: "identity", level: 1, column: "platform_short_name", cssVar: null, inputType: "text", default: "GGSP" },
  { id: "tagline", label: "Tagline / Slogan", category: "identity", studioSection: "identity", level: 1, column: "tagline", cssVar: null, inputType: "text", default: "The Operating System for Football Competitions" },
  { id: "companyName", label: "Company Name", category: "identity", studioSection: "identity", level: 1, column: "company_name", cssVar: null, inputType: "text", default: "GoodGrafik" },
  { id: "copyrightText", label: "Copyright Text", category: "identity", studioSection: "identity", level: 1, column: "copyright_text", cssVar: null, inputType: "text", default: "© GoodGrafik. All rights reserved." },
  { id: "footerText", label: "Footer Text", category: "identity", studioSection: "identity", level: 1, column: "footer_text", cssVar: null, inputType: "text", default: "Securely powered by GoodGrafik" },
  { id: "browserTitle", label: "Browser Title", category: "identity", studioSection: "identity", level: 1, column: "browser_title", cssVar: null, inputType: "text", default: "GoodGrafik Sports Platform" },
  { id: "browserDescription", label: "Browser Description", category: "identity", studioSection: "identity", level: 1, column: "browser_description", cssVar: null, inputType: "textarea", default: "Run every matchday from one command center." },
];

export const LEVEL_1_BRAND_ASSET_TOKENS: ThemeToken[] = [
  { id: "mainLogo", label: "Main Logo", category: "brand-assets", studioSection: "logos-assets", level: 1, column: "organization_logo_url", cssVar: "--ggsp-logo-main", inputType: "image", default: null },
  { id: "smallLogo", label: "Small Logo", category: "brand-assets", studioSection: "logos-assets", level: 1, column: "small_logo_url", cssVar: "--ggsp-logo-small", inputType: "image", default: null },
  { id: "headerLogo", label: "Header Logo", category: "brand-assets", studioSection: "logos-assets", level: 1, column: "header_logo_url", cssVar: "--ggsp-logo-header", inputType: "image", default: null },
  { id: "loginLogo", label: "Login Logo", category: "brand-assets", studioSection: "logos-assets", level: 1, column: "login_logo_url", cssVar: "--ggsp-logo-login", inputType: "image", default: null },
  { id: "loadingLogo", label: "Loading Logo", category: "brand-assets", studioSection: "logos-assets", level: 1, column: "loading_logo_url", cssVar: "--ggsp-logo-loading", inputType: "image", default: null },
  { id: "splashScreen", label: "Splash Screen", category: "brand-assets", studioSection: "logos-assets", level: 1, column: "splash_screen_url", cssVar: "--ggsp-splash-screen", inputType: "image", default: null },
  { id: "favicon", label: "Browser Favicon", category: "brand-assets", studioSection: "logos-assets", level: 1, column: "favicon_url", cssVar: null, inputType: "image", default: null },
  { id: "browserIcon", label: "Browser Icon", category: "brand-assets", studioSection: "logos-assets", level: 1, column: "browser_icon_url", cssVar: null, inputType: "image", default: null },
  { id: "placeholderLogo", label: "Default Placeholder Logo", category: "brand-assets", studioSection: "logos-assets", level: 1, column: "placeholder_logo_url", cssVar: "--ggsp-logo-placeholder", inputType: "image", default: null },
];

export const LEVEL_1_VISUAL_THEME_TOKENS: ThemeToken[] = [
  { id: "primaryColor", label: "Primary Color", category: "visual-theme", studioSection: "colors", level: 1, column: "primary_color", cssVar: "--ggsp-color-primary", inputType: "color", default: "#f5a623", helperText: "Live in preview — drives buttons, accents, active nav." },
  { id: "secondaryColor", label: "Secondary Color", category: "visual-theme", studioSection: "colors", level: 1, column: "secondary_color", cssVar: "--ggsp-color-secondary", inputType: "color", default: "#0d1117", helperText: "Saved now, applied platform-wide by the palette migration follow-up." },
  { id: "accentColor", label: "Accent Color", category: "visual-theme", studioSection: "colors", level: 1, column: "accent_color", cssVar: "--ggsp-color-accent", inputType: "color", default: "#22c55e", helperText: "Saved now, applied platform-wide by the palette migration follow-up." },
  { id: "successColor", label: "Success Color", category: "visual-theme", studioSection: "colors", level: 1, column: "success_color", cssVar: "--ggsp-color-success", inputType: "color", default: "#22c55e", helperText: "Live in preview — drives submitted/positive status." },
  { id: "warningColor", label: "Warning Color", category: "visual-theme", studioSection: "colors", level: 1, column: "warning_color", cssVar: "--ggsp-color-warning", inputType: "color", default: "#eab308", helperText: "Live in preview — drives waiting/attention status." },
  { id: "errorColor", label: "Error Color", category: "visual-theme", studioSection: "colors", level: 1, column: "error_color", cssVar: "--ggsp-color-error", inputType: "color", default: "#ef4444", helperText: "Live in preview — drives correction/negative status." },
  { id: "backgroundColor", label: "Background Color", category: "visual-theme", studioSection: "colors", level: 1, column: "background_color", cssVar: "--ggsp-color-background", inputType: "color", default: "#07090d", helperText: "Live in preview — page background." },
  { id: "surfaceColor", label: "Surface/Card Color", category: "visual-theme", studioSection: "colors", level: 1, column: "surface_color", cssVar: "--ggsp-color-surface", inputType: "color", default: "#111720", helperText: "Live in preview — card and panel background." },
  { id: "navigationColor", label: "Navigation Color", category: "visual-theme", studioSection: "colors", level: 1, column: "navigation_color", cssVar: "--ggsp-color-navigation", inputType: "color", default: "#0d1117", helperText: "Saved now, applied platform-wide by the palette migration follow-up." },
  { id: "headerColor", label: "Header Color", category: "visual-theme", studioSection: "colors", level: 1, column: "header_color", cssVar: "--ggsp-color-header", inputType: "color", default: "#0d1117", helperText: "Saved now, applied platform-wide by the palette migration follow-up." },
  { id: "sidebarColor", label: "Sidebar Color", category: "visual-theme", studioSection: "colors", level: 1, column: "sidebar_color", cssVar: "--ggsp-color-sidebar", inputType: "color", default: "#0d1117", helperText: "Saved now, applied platform-wide by the palette migration follow-up." },
  { id: "buttonColor", label: "Button Color", category: "visual-theme", studioSection: "colors", level: 1, column: "button_color", cssVar: "--ggsp-color-button", inputType: "color", default: "#f5a623", helperText: "Saved now, applied platform-wide by the palette migration follow-up." },
  { id: "linkColor", label: "Link Color", category: "visual-theme", studioSection: "colors", level: 1, column: "link_color", cssVar: "--ggsp-color-link", inputType: "color", default: "#f5a623", helperText: "Saved now, applied platform-wide by the palette migration follow-up." },
];

export const LEVEL_1_TYPOGRAPHY_TOKENS: ThemeToken[] = [
  { id: "fontFamily", label: "Font Family", category: "typography", studioSection: "typography", level: 1, column: "font_family", cssVar: "--ggsp-font-family", inputType: "select", default: "Inter", options: ["Inter", "Oswald", "Roboto", "Poppins", "System UI"], helperText: "Preview uses each family's system/best-effort fallback; loading additional web fonts on demand is a follow-up." },
  { id: "fontWeight", label: "Font Weight", category: "typography", studioSection: "typography", level: 1, column: "font_weight", cssVar: "--ggsp-font-weight", inputType: "select", default: "normal", options: ["light", "normal", "medium", "semibold", "bold"] },
  { id: "headingStyle", label: "Heading Style", category: "typography", studioSection: "typography", level: 1, column: "heading_style", cssVar: "--ggsp-heading-style", inputType: "select", default: "display", options: ["display", "condensed", "classic", "uppercase"] },
  { id: "textStyle", label: "Text Style", category: "typography", studioSection: "typography", level: 1, column: "text_style", cssVar: "--ggsp-text-style", inputType: "select", default: "regular", options: ["regular", "relaxed", "compact"] },
];

export const LEVEL_1_LAYOUT_TOKENS: ThemeToken[] = [
  { id: "logoSize", label: "Logo Size", category: "layout", studioSection: "layout", level: 1, column: "logo_size", cssVar: "--ggsp-logo-size", inputType: "number", default: 40, helperText: "px" },
  { id: "logoPadding", label: "Logo Padding", category: "layout", studioSection: "layout", level: 1, column: "logo_padding", cssVar: "--ggsp-logo-padding", inputType: "number", default: 8, helperText: "px" },
  { id: "headerHeight", label: "Header Height", category: "layout", studioSection: "navigation", level: 1, column: "header_height", cssVar: "--ggsp-header-height", inputType: "number", default: 64, helperText: "px" },
  { id: "sidebarWidth", label: "Sidebar Width", category: "layout", studioSection: "navigation", level: 1, column: "sidebar_width", cssVar: "--ggsp-sidebar-width", inputType: "number", default: 260, helperText: "px" },
  { id: "borderRadius", label: "Border Radius", category: "layout", studioSection: "components", level: 1, column: "border_radius", cssVar: "--ggsp-radius", inputType: "number", default: 16, helperText: "px · live in preview" },
  { id: "shadowStyle", label: "Shadow Style", category: "layout", studioSection: "components", level: 1, column: "shadow_style", cssVar: "--ggsp-shadow-style", inputType: "select", default: "soft", options: ["none", "soft", "elevated", "sharp"], helperText: "Live in preview" },
  { id: "cardStyle", label: "Card Style", category: "layout", studioSection: "components", level: 1, column: "card_style", cssVar: "--ggsp-card-style", inputType: "select", default: "glass", options: ["glass", "solid", "flat", "outlined"] },
];

export const LEVEL_1_BEHAVIOR_TOKENS: ThemeToken[] = [
  { id: "lightModeEnabled", label: "Light Mode", category: "behavior", studioSection: "motion", level: 1, column: "light_mode_enabled", cssVar: null, inputType: "toggle", default: false },
  { id: "darkModeEnabled", label: "Dark Mode", category: "behavior", studioSection: "motion", level: 1, column: "dark_mode_enabled", cssVar: null, inputType: "toggle", default: true },
  { id: "defaultTheme", label: "Default Theme", category: "behavior", studioSection: "motion", level: 1, column: "default_theme", cssVar: null, inputType: "select", default: "dark", options: ["dark", "light", "system"] },
  { id: "animationLevel", label: "Animation Level", category: "behavior", studioSection: "motion", level: 1, column: "animation_level", cssVar: "--ggsp-animation-level", inputType: "select", default: "normal", options: ["none", "reduced", "normal", "playful"] },
];

export const LEVEL_1_TOKENS: ThemeToken[] = [
  ...LEVEL_1_IDENTITY_TOKENS,
  ...LEVEL_1_BRAND_ASSET_TOKENS,
  ...LEVEL_1_VISUAL_THEME_TOKENS,
  ...LEVEL_1_TYPOGRAPHY_TOKENS,
  ...LEVEL_1_LAYOUT_TOKENS,
  ...LEVEL_1_BEHAVIOR_TOKENS,
];

/**
 * Level 2 (Competition Administrator) tokens. Deliberately identity /
 * assets / color / media only — no typography, layout, or behavior
 * override, per spec ("They may only customize the competition they
 * manage" from a fixed allowed-settings list). Sponsor logos are a
 * one-to-many gallery (competition_sponsor_logos), not a single token,
 * so it's listed separately in lib/branding.ts rather than here.
 */
export const LEVEL_2_TOKENS: ThemeToken[] = [
  { id: "competitionName", label: "Competition Name", category: "competition-identity", studioSection: "identity", level: 2, column: "name", cssVar: null, inputType: "text", default: null },
  { id: "competitionShortName", label: "Competition Short Name", category: "competition-identity", studioSection: "identity", level: 2, column: "short_name", cssVar: null, inputType: "text", default: null },
  { id: "competitionSeason", label: "Season", category: "competition-identity", studioSection: "identity", level: 2, column: "season_label", cssVar: null, inputType: "text", default: null },
  { id: "competitionLogo", label: "Competition Logo", category: "competition-assets", studioSection: "logos-assets", level: 2, column: "logo_url", cssVar: "--ggsp-comp-logo", inputType: "image", default: null },
  { id: "competitionBanner", label: "Competition Banner", category: "competition-assets", studioSection: "logos-assets", level: 2, column: "banner_url", cssVar: "--ggsp-comp-banner", inputType: "image", default: null },
  { id: "competitionThemeColor", label: "Competition Theme Color", category: "competition-theme", studioSection: "colors", level: 2, column: "theme_color", cssVar: "--ggsp-color-primary", inputType: "color", default: null },
  { id: "competitionAccentColor", label: "Competition Accent Color", category: "competition-theme", studioSection: "colors", level: 2, column: "accent_color", cssVar: "--ggsp-color-accent", inputType: "color", default: null },
  { id: "competitionBackgroundImage", label: "Competition Background Image", category: "competition-media", studioSection: "logos-assets", level: 2, column: "background_image_url", cssVar: "--ggsp-comp-background", inputType: "image", default: null },
  { id: "competitionIntroVideo", label: "Competition Intro Video", category: "competition-media", studioSection: "logos-assets", level: 2, column: "intro_video_url", cssVar: null, inputType: "text", default: null },
  { id: "competitionWatermark", label: "Competition Watermark", category: "competition-media", studioSection: "logos-assets", level: 2, column: "watermark_url", cssVar: "--ggsp-comp-watermark", inputType: "image", default: null },
];

export const ALL_TOKENS: ThemeToken[] = [...LEVEL_1_TOKENS, ...LEVEL_2_TOKENS];

export function tokensByCategory(category: TokenCategory): ThemeToken[] {
  return ALL_TOKENS.filter((t) => t.category === category);
}

/** Every Level 1 token assigned to a given Brand Studio section, in registry order — what the Studio's left panel renders for that section. */
export function tokensByStudioSection(section: StudioSection): ThemeToken[] {
  return ALL_TOKENS.filter((t) => t.studioSection === section);
}

/** Every token that has a CSS custom property — what a ThemeScope needs to set. */
export const CSS_VAR_TOKENS: ThemeToken[] = ALL_TOKENS.filter((t) => t.cssVar !== null);

/**
 * A handful of Level 1 tokens predate this registry and were named to
 * match their original, already-shipped `PlatformBranding` field (see
 * lib/branding.ts) instead of a fresh camelCase-of-the-column name —
 * kept as-is rather than renamed, to avoid a breaking change to every
 * existing caller of `PlatformBranding`. This table is the one place
 * that maps a token's registry `id` to its real `PlatformBranding` key
 * whenever the two differ; anything not listed here uses its `id`
 * unchanged. Both lib/branding.ts (server, CSS var serialization) and
 * the Brand Studio's client-side draft/preview code (see
 * components/brand-studio/draft-utils.ts, which has no "server-only"
 * dependency) import this same table so the mapping can never drift
 * between the two.
 */
export const PLATFORM_BRANDING_FIELD_BY_TOKEN_ID: Record<string, string> = {
  platformName: "organizationName",
  mainLogo: "organizationLogoUrl",
  smallLogo: "smallLogoUrl",
  headerLogo: "headerLogoUrl",
  loginLogo: "loginLogoUrl",
  loadingLogo: "loadingLogoUrl",
  splashScreen: "splashScreenUrl",
  favicon: "faviconUrl",
  browserIcon: "browserIconUrl",
  placeholderLogo: "placeholderLogoUrl",
};

/** Resolves the `PlatformBranding` object key a given token's value actually lives under — see PLATFORM_BRANDING_FIELD_BY_TOKEN_ID above. */
export function platformBrandingFieldForToken(tokenId: string): string {
  return PLATFORM_BRANDING_FIELD_BY_TOKEN_ID[tokenId] ?? tokenId;
}
