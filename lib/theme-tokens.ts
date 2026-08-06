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

/**
 * Color Studio (Sprint 3, Phase 1) grouping for `inputType: "color"`
 * tokens — purely presentational, like `studioSection`, but one level
 * more specific: it's how ColorStudio.tsx clusters swatches into
 * "Primary" / "Secondary" / "Accent" / "Semantic" / "Surface" / "Text"
 * cards (each with its own live 50–900 scale where applicable) instead
 * of one flat list. "legacy" covers the pre-Color-Studio tokens
 * (navigation/header/sidebar/button/link) that are still saved and
 * exposed as CSS vars but not yet wired into any real component — they
 * render in their own "Additional Surfaces" card so the primary redesign
 * doesn't bury them, without pretending they're equally load-bearing.
 */
export type ColorGroup = "primary" | "secondary" | "accent" | "semantic" | "surface" | "text" | "legacy";

/** For a token that's part of a gradient pair (currently Primary and Accent), which piece of the gradient control it is. Absent on every plain solid-color token. */
export type ColorRole = "base" | "gradientEnabled" | "gradientEnd" | "gradientAngle";

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
  /** Color Studio grouping — see ColorGroup's doc comment. Only set on `inputType: "color"` tokens. */
  colorGroup?: ColorGroup;
  /** Which piece of a gradient pair this token is — see ColorRole's doc comment. Only set on the small number of gradient-related tokens. */
  colorRole?: ColorRole;
  /** CSS unit an `inputType: "number"` token's value is serialized with (draft-utils.ts's draftToCssVars, lib/branding.ts's platformBrandingToCssVars) — defaults to "px" when omitted, matching every number token that predates this field (logoSize, headerHeight, borderRadius, ...). Set "em" or "" (unitless, e.g. a line-height multiplier or a scale ratio) on a token whose CSS property isn't a pixel length. */
  unit?: "px" | "em" | "";
  /** Renders as a range slider (ControlPanel's TokenField) instead of a plain number input when both are set. */
  min?: number;
  max?: number;
  step?: number;
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
  { id: "mainLogo", label: "Main Logo", category: "brand-assets", studioSection: "logos-assets", level: 1, column: "organization_logo_url", cssVar: "--ggsp-logo-main", inputType: "image", default: null, helperText: "Live sitewide — BrandMark.tsx, used in the sidebar, header, login screen, and footer." },
  // The eight variants below are saved, previewable, and exposed as CSS
  // vars, but (unlike Main Logo) no real component reads them yet — each
  // needs a page/component that doesn't exist today (a loading screen, a
  // splash screen, a distinct login-only mark) or duplicates Main Logo's
  // job (a second app icon). Marked Reserved rather than silently implying
  // they already do something, same as Border/Text color in the Colors
  // section — a real target for each is a follow-up, not a UI-only fix.
  { id: "smallLogo", label: "Small Logo", category: "brand-assets", studioSection: "logos-assets", level: 1, column: "small_logo_url", cssVar: "--ggsp-logo-small", inputType: "image", default: null, helperText: "Reserved — no compact/collapsed surface reads this yet; the sidebar's collapsed rail still uses Main Logo." },
  { id: "headerLogo", label: "Header Logo", category: "brand-assets", studioSection: "logos-assets", level: 1, column: "header_logo_url", cssVar: "--ggsp-logo-header", inputType: "image", default: null, helperText: "Reserved — the app header uses Main Logo via BrandMark; a header-specific override is a follow-up." },
  { id: "loginLogo", label: "Login Logo", category: "brand-assets", studioSection: "logos-assets", level: 1, column: "login_logo_url", cssVar: "--ggsp-logo-login", inputType: "image", default: null, helperText: "Reserved — the login screen (AuthFrameView) shows Main Logo today." },
  { id: "loadingLogo", label: "Loading Logo", category: "brand-assets", studioSection: "logos-assets", level: 1, column: "loading_logo_url", cssVar: "--ggsp-logo-loading", inputType: "image", default: null, helperText: "Reserved — LoadingState.tsx has no logo mark to swap yet." },
  { id: "splashScreen", label: "Splash Screen", category: "brand-assets", studioSection: "logos-assets", level: 1, column: "splash_screen_url", cssVar: "--ggsp-splash-screen", inputType: "image", default: null, helperText: "Reserved — the platform has no splash/boot screen yet." },
  { id: "favicon", label: "Browser Favicon", category: "brand-assets", studioSection: "logos-assets", level: 1, column: "favicon_url", cssVar: null, inputType: "image", default: null, helperText: "Reserved — not yet wired into the page's <link rel=\"icon\">; the static favicon still shows in the browser tab." },
  { id: "browserIcon", label: "Browser Icon", category: "brand-assets", studioSection: "logos-assets", level: 1, column: "browser_icon_url", cssVar: null, inputType: "image", default: null, helperText: "Reserved — overlaps Favicon's purpose; not yet wired to a distinct target." },
  { id: "placeholderLogo", label: "Default Placeholder Logo", category: "brand-assets", studioSection: "logos-assets", level: 1, column: "placeholder_logo_url", cssVar: "--ggsp-logo-placeholder", inputType: "image", default: null, helperText: "Reserved — no team/organization-without-a-crest surface falls back to this yet." },
];

export const LEVEL_1_VISUAL_THEME_TOKENS: ThemeToken[] = [
  // --- Primary — base color + live 50–900 scale + optional gradient ---
  { id: "primaryColor", label: "Primary", category: "visual-theme", studioSection: "colors", level: 1, column: "primary_color", cssVar: "--ggsp-color-primary", inputType: "color", default: "#f5a623", helperText: "Live in preview — drives buttons, accents, active nav.", colorGroup: "primary", colorRole: "base" },
  { id: "primaryGradientEnabled", label: "Primary Gradient", category: "visual-theme", studioSection: "colors", level: 1, column: "primary_gradient_enabled", cssVar: null, inputType: "toggle", default: false, helperText: "Blend Primary into a second color for hero/button surfaces.", colorGroup: "primary", colorRole: "gradientEnabled" },
  { id: "primaryGradientEnd", label: "Primary Gradient End", category: "visual-theme", studioSection: "colors", level: 1, column: "primary_gradient_end", cssVar: "--ggsp-gradient-primary-end", inputType: "color", default: "#f59e0b", colorGroup: "primary", colorRole: "gradientEnd" },
  { id: "primaryGradientAngle", label: "Primary Gradient Angle", category: "visual-theme", studioSection: "colors", level: 1, column: "primary_gradient_angle", cssVar: "--ggsp-gradient-primary-angle", inputType: "number", default: 135, helperText: "degrees", colorGroup: "primary", colorRole: "gradientAngle" },

  // --- Secondary — base color + live 50–900 scale ---
  { id: "secondaryColor", label: "Secondary", category: "visual-theme", studioSection: "colors", level: 1, column: "secondary_color", cssVar: "--ggsp-color-secondary", inputType: "color", default: "#0d1117", helperText: "Saved now, applied platform-wide by the palette migration follow-up.", colorGroup: "secondary", colorRole: "base" },

  // --- Accent — base color + optional gradient ---
  { id: "accentColor", label: "Accent", category: "visual-theme", studioSection: "colors", level: 1, column: "accent_color", cssVar: "--ggsp-color-accent", inputType: "color", default: "#22c55e", helperText: "Saved now, applied platform-wide by the palette migration follow-up.", colorGroup: "accent", colorRole: "base" },
  { id: "accentGradientEnabled", label: "Accent Gradient", category: "visual-theme", studioSection: "colors", level: 1, column: "accent_gradient_enabled", cssVar: null, inputType: "toggle", default: false, helperText: "Blend Accent into a second color for hero/button surfaces.", colorGroup: "accent", colorRole: "gradientEnabled" },
  { id: "accentGradientEnd", label: "Accent Gradient End", category: "visual-theme", studioSection: "colors", level: 1, column: "accent_gradient_end", cssVar: "--ggsp-gradient-accent-end", inputType: "color", default: "#16a34a", colorGroup: "accent", colorRole: "gradientEnd" },
  { id: "accentGradientAngle", label: "Accent Gradient Angle", category: "visual-theme", studioSection: "colors", level: 1, column: "accent_gradient_angle", cssVar: "--ggsp-gradient-accent-angle", inputType: "number", default: 135, helperText: "degrees", colorGroup: "accent", colorRole: "gradientAngle" },

  // --- Semantic status colors ---
  { id: "successColor", label: "Success", category: "visual-theme", studioSection: "colors", level: 1, column: "success_color", cssVar: "--ggsp-color-success", inputType: "color", default: "#22c55e", helperText: "Live in preview — drives submitted/positive status.", colorGroup: "semantic" },
  { id: "warningColor", label: "Warning", category: "visual-theme", studioSection: "colors", level: 1, column: "warning_color", cssVar: "--ggsp-color-warning", inputType: "color", default: "#eab308", helperText: "Live in preview — drives waiting/attention status.", colorGroup: "semantic" },
  { id: "errorColor", label: "Danger", category: "visual-theme", studioSection: "colors", level: 1, column: "error_color", cssVar: "--ggsp-color-error", inputType: "color", default: "#ef4444", helperText: "Live in preview — drives correction/negative status.", colorGroup: "semantic" },
  { id: "infoColor", label: "Info", category: "visual-theme", studioSection: "colors", level: 1, column: "info_color", cssVar: "--ggsp-color-info", inputType: "color", default: "#38bdf8", helperText: "Live in preview — a fourth status color alongside Success/Warning/Danger.", colorGroup: "semantic" },

  // --- Surface / background / border ---
  { id: "backgroundColor", label: "Background", category: "visual-theme", studioSection: "colors", level: 1, column: "background_color", cssVar: "--ggsp-color-background", inputType: "color", default: "#07090d", helperText: "Live in preview — page background.", colorGroup: "surface" },
  { id: "surfaceColor", label: "Surface / Card", category: "visual-theme", studioSection: "colors", level: 1, column: "surface_color", cssVar: "--ggsp-color-surface", inputType: "color", default: "#111720", helperText: "Live in preview — card and panel background.", colorGroup: "surface" },
  // Deliberately NOT wired into .surface-panel/.surface-subtle's border —
  // those rely on a *light*, translucent white hairline for the glass-panel
  // reflection effect (app/globals.css); this token's own default (a dark
  // navy) would visibly break that on every card in the app. A true
  // "inherit until explicitly overridden" behavior needs border_color to be
  // nullable so an unset value can mean "don't touch," not "apply my
  // not-null default" — this project's migrations are additive/no-ALTER-
  // COLUMN by discipline (tests/migrations/migration-integrity.test.ts), so
  // that's a real schema decision for a follow-up, not a mechanical fix.
  { id: "borderColor", label: "Border", category: "visual-theme", studioSection: "colors", level: 1, column: "border_color", cssVar: "--ggsp-color-border", inputType: "color", default: "#232b35", helperText: "Reserved — limited effect in the current theme. The glass-panel border stays translucent white regardless, to protect the panel reflection effect.", colorGroup: "surface" },

  // --- Text ---
  // Also Reserved: text-white/NN opacity utilities are used directly at
  // hundreds of call sites (not through a shared class the way borders
  // mostly are), so retargeting "Text Primary"/"Text Secondary" safely
  // needs a real migration plan, not a blind find-and-replace.
  { id: "textPrimaryColor", label: "Text Primary", category: "visual-theme", studioSection: "colors", level: 1, column: "text_primary_color", cssVar: "--ggsp-color-text-primary", inputType: "color", default: "#f5f7fa", helperText: "Reserved — limited effect in the current theme. Body text is styled with opacity-modified white at hundreds of call sites; a safe migration is a follow-up.", colorGroup: "text" },
  { id: "textSecondaryColor", label: "Text Secondary", category: "visual-theme", studioSection: "colors", level: 1, column: "text_secondary_color", cssVar: "--ggsp-color-text-secondary", inputType: "color", default: "#8b98a5", helperText: "Reserved — limited effect in the current theme. Same reason as Text Primary.", colorGroup: "text" },

  // --- Additional surfaces (each repurposed to one real, scoped target — see components/shell/AppShell.tsx and components/ui/Button.tsx) ---
  { id: "navigationColor", label: "Navigation", category: "visual-theme", studioSection: "colors", level: 1, column: "navigation_color", cssVar: "--ggsp-color-navigation", inputType: "color", default: "#0d1117", helperText: "Live in preview — the active nav item's accent bar (layered on Primary's pill, not replacing it).", colorGroup: "legacy" },
  { id: "headerColor", label: "Header", category: "visual-theme", studioSection: "colors", level: 1, column: "header_color", cssVar: "--ggsp-color-header", inputType: "color", default: "#0d1117", helperText: "Live in preview — the top app header bar, independent from the page Background.", colorGroup: "legacy" },
  { id: "sidebarColor", label: "Sidebar", category: "visual-theme", studioSection: "colors", level: 1, column: "sidebar_color", cssVar: "--ggsp-color-sidebar", inputType: "color", default: "#0d1117", helperText: "Live in preview — the sidebar surface, independent from the page Background.", colorGroup: "legacy" },
  { id: "buttonColor", label: "Button", category: "visual-theme", studioSection: "colors", level: 1, column: "button_color", cssVar: "--ggsp-color-button", inputType: "color", default: "#f5a623", helperText: "Live in preview — secondary buttons only. Primary CTA buttons stay on Primary Color.", colorGroup: "legacy" },
  { id: "linkColor", label: "Link", category: "visual-theme", studioSection: "colors", level: 1, column: "link_color", cssVar: "--ggsp-color-link", inputType: "color", default: "#f5a623", helperText: "Live in preview — breadcrumb navigation links today; more inline-link surfaces are a follow-up.", colorGroup: "legacy" },
];

/** Every Level 1 "color" token that has a `colorGroup` — what ColorStudio.tsx renders instead of ControlPanel's generic token grid when the "Colors" section is active. */
export function level1ColorTokens(): ThemeToken[] {
  return LEVEL_1_VISUAL_THEME_TOKENS.filter((t) => t.colorGroup);
}

/** All tokens sharing one ColorGroup, in registry order — e.g. `colorTokensByGroup("primary")` returns the base color plus its three gradient sub-tokens. */
export function colorTokensByGroup(group: ColorGroup): ThemeToken[] {
  return LEVEL_1_VISUAL_THEME_TOKENS.filter((t) => t.colorGroup === group);
}

export const LEVEL_1_TYPOGRAPHY_TOKENS: ThemeToken[] = [
  { id: "fontFamily", label: "Font Family", category: "typography", studioSection: "typography", level: 1, column: "font_family", cssVar: "--ggsp-font-family", inputType: "select", default: "Inter", options: ["Inter", "Oswald", "Roboto", "Poppins", "System UI"], helperText: "Preview uses each family's system/best-effort fallback; loading additional web fonts on demand is a follow-up." },
  { id: "fontWeight", label: "Font Weight", category: "typography", studioSection: "typography", level: 1, column: "font_weight", cssVar: "--ggsp-font-weight", inputType: "select", default: "normal", options: ["light", "normal", "medium", "semibold", "bold"] },
  { id: "headingStyle", label: "Heading Style", category: "typography", studioSection: "typography", level: 1, column: "heading_style", cssVar: "--ggsp-heading-style", inputType: "select", default: "display", options: ["display", "condensed", "classic", "uppercase"] },
  { id: "textStyle", label: "Text Style", category: "typography", studioSection: "typography", level: 1, column: "text_style", cssVar: "--ggsp-text-style", inputType: "select", default: "regular", options: ["regular", "relaxed", "compact"] },
  { id: "letterSpacing", label: "Letter Spacing", category: "typography", studioSection: "typography", level: 1, column: "letter_spacing_em", cssVar: "--ggsp-letter-spacing", inputType: "number", unit: "em", default: 0, min: -0.02, max: 0.15, step: 0.005, helperText: "em · live in the Typography preview" },
  { id: "lineHeight", label: "Line Height", category: "typography", studioSection: "typography", level: 1, column: "line_height", cssVar: "--ggsp-line-height", inputType: "number", unit: "", default: 1.6, min: 1.1, max: 2, step: 0.05, helperText: "× font size · live in the Typography preview" },
  { id: "paragraphSpacing", label: "Paragraph Spacing", category: "typography", studioSection: "typography", level: 1, column: "paragraph_spacing_px", cssVar: "--ggsp-paragraph-spacing", inputType: "number", unit: "px", default: 16, min: 0, max: 48, step: 2, helperText: "px between paragraphs · live in the Typography preview" },
  { id: "textTransform", label: "Text Transform", category: "typography", studioSection: "typography", level: 1, column: "text_transform", cssVar: "--ggsp-text-transform", inputType: "select", default: "none", options: ["none", "uppercase", "lowercase", "capitalize"], helperText: "Applied to headings · live in the Typography preview" },
  { id: "fontSizeScale", label: "Font Size Scale", category: "typography", studioSection: "typography", level: 1, column: "font_size_scale", cssVar: "--ggsp-font-size-scale", inputType: "number", unit: "", default: 1, min: 0.85, max: 1.3, step: 0.01, helperText: "Reserved — scales the Typography specimen only for now; a sitewide rem-based rollout risks also rescaling spacing/icons that share Tailwind's rem units, so it needs a considered follow-up, not this token alone." },
];

export const LEVEL_1_LAYOUT_TOKENS: ThemeToken[] = [
  { id: "logoSize", label: "Logo Size", category: "layout", studioSection: "layout", level: 1, column: "logo_size", cssVar: "--ggsp-logo-size", inputType: "number", default: 40, helperText: "px" },
  { id: "logoPadding", label: "Logo Padding", category: "layout", studioSection: "layout", level: 1, column: "logo_padding", cssVar: "--ggsp-logo-padding", inputType: "number", default: 8, helperText: "px" },
  { id: "headerHeight", label: "Header Height", category: "layout", studioSection: "navigation", level: 1, column: "header_height", cssVar: "--ggsp-header-height", inputType: "number", default: 64, helperText: "px" },
  { id: "sidebarWidth", label: "Sidebar Width", category: "layout", studioSection: "navigation", level: 1, column: "sidebar_width", cssVar: "--ggsp-sidebar-width", inputType: "number", default: 260, helperText: "px" },
  { id: "borderRadius", label: "Border Radius", category: "layout", studioSection: "components", level: 1, column: "border_radius", cssVar: "--ggsp-radius", inputType: "number", default: 16, min: 0, max: 32, step: 1, helperText: "px · live in preview and sitewide — buttons, inputs, and cards scale together (cards stay 1.5× the base radius, matching the design's existing xl/2xl relationship)" },
  // shadowStyle/cardStyle/inputStyle/badgeShape below have no cssVar: none
  // of the four is a single CSS value (each switches between a small set of
  // unrelated properties — background + backdrop-filter + box-shadow for
  // Card Style, for instance), so there's no `var(--ggsp-x)` a real
  // stylesheet rule could consume directly. Instead each is applied as a
  // `ggsp-<token>-<value>` class (see componentStyleClassNames below) that
  // app/globals.css keys a small set of override rules off of — the same
  // mechanism Motion's Reduced Motion toggle already uses.
  { id: "shadowStyle", label: "Shadow Style", category: "layout", studioSection: "components", level: 1, column: "shadow_style", cssVar: null, inputType: "select", default: "soft", options: ["none", "soft", "elevated", "sharp"], helperText: "Live in preview and sitewide — card and primary-button elevation" },
  { id: "cardStyle", label: "Card Style", category: "layout", studioSection: "components", level: 1, column: "card_style", cssVar: null, inputType: "select", default: "glass", options: ["glass", "solid", "flat", "outlined"], helperText: "Live in preview and sitewide — the surface-panel treatment every card, modal, and panel shares" },
  { id: "inputStyle", label: "Input Style", category: "layout", studioSection: "components", level: 1, column: "input_style", cssVar: null, inputType: "select", default: "filled", options: ["filled", "outlined", "underlined"], helperText: "Live in preview and sitewide — Input and Select fields" },
  { id: "badgeShape", label: "Badge Shape", category: "layout", studioSection: "components", level: 1, column: "badge_shape", cssVar: null, inputType: "select", default: "pill", options: ["pill", "rounded", "square"], helperText: "Live in preview and sitewide — role and status chips" },
];

/** `ggsp-<prefix>-<value>` class prefix for each class-based (non-cssVar) Components token — see the tokens' own comment above for why they're classes instead of vars. */
const COMPONENT_STYLE_CLASS_PREFIX: Record<string, string> = {
  cardStyle: "ggsp-card",
  shadowStyle: "ggsp-shadow",
  inputStyle: "ggsp-input",
  badgeShape: "ggsp-badge",
};

/**
 * Body/ThemeScope class names for the class-based Components tokens —
 * shared by app/layout.tsx (from the saved PlatformBranding) and
 * PreviewSurface.tsx (from the live draft) so both stay driven by the same
 * lookup instead of two independent copies of "which value means default."
 * Only emits a class when a value differs from the token's own default,
 * since the default always matches the app's un-themed baseline (defined
 * directly in app/globals.css) and needs no override rule.
 */
export function componentStyleClassNames(values: Record<string, unknown>): string {
  const classes: string[] = [];
  for (const [tokenId, prefix] of Object.entries(COMPONENT_STYLE_CLASS_PREFIX)) {
    const value = values[tokenId];
    const def = LEVEL_1_LAYOUT_TOKENS.find((t) => t.id === tokenId)?.default;
    if (typeof value === "string" && value !== def) classes.push(`${prefix}-${value}`);
  }
  return classes.join(" ");
}

export const LEVEL_1_BEHAVIOR_TOKENS: ThemeToken[] = [
  { id: "lightModeEnabled", label: "Light Mode", category: "behavior", studioSection: "motion", level: 1, column: "light_mode_enabled", cssVar: null, inputType: "toggle", default: false },
  { id: "darkModeEnabled", label: "Dark Mode", category: "behavior", studioSection: "motion", level: 1, column: "dark_mode_enabled", cssVar: null, inputType: "toggle", default: true },
  { id: "defaultTheme", label: "Default Theme", category: "behavior", studioSection: "motion", level: 1, column: "default_theme", cssVar: null, inputType: "select", default: "dark", options: ["dark", "light", "system"] },
  { id: "animationLevel", label: "Animation Level", category: "behavior", studioSection: "motion", level: 1, column: "animation_level", cssVar: "--ggsp-animation-level", inputType: "select", default: "normal", options: ["none", "reduced", "normal", "playful"] },

  // --- Granular motion controls (each with a real, verified target — see
  // app/globals.css's .ggsp-motion-scope rules and components/ui/Modal.tsx /
  // LoadingState.tsx). "Page Transitions" and "Toast Animation" aren't
  // included: this app has no route-transition system and no toast
  // component to attach either to yet — adding the field without the
  // target it's supposed to control would be the exact "wire it for the
  // sake of the checklist" mistake Border Color already warned against. ---
  { id: "animationSpeed", label: "Animation Speed", category: "behavior", studioSection: "motion", level: 1, column: "animation_speed", cssVar: "--ggsp-animation-speed", inputType: "number", unit: "", default: 1, min: 0.25, max: 2, step: 0.05, helperText: "× · live in preview — scales every fade/slide/pulse animation's duration" },
  { id: "hoverEffectsEnabled", label: "Hover Effects", category: "behavior", studioSection: "motion", level: 1, column: "hover_effects_enabled", cssVar: "--ggsp-hover-effects", inputType: "toggle", default: true, helperText: "Live in preview — button/card lift-on-hover micro-interactions" },
  { id: "modalAnimationEnabled", label: "Modal Animation", category: "behavior", studioSection: "motion", level: 1, column: "modal_animation_enabled", cssVar: "--ggsp-modal-animation", inputType: "toggle", default: true, helperText: "Live in preview — the scale-in every Modal opens with" },
  { id: "loadingAnimationEnabled", label: "Loading Animation", category: "behavior", studioSection: "motion", level: 1, column: "loading_animation_enabled", cssVar: "--ggsp-loading-animation", inputType: "toggle", default: true, helperText: "Live in preview — the pulse LoadingState shows while content loads" },
  { id: "smoothScrollEnabled", label: "Smooth Scroll", category: "behavior", studioSection: "motion", level: 1, column: "smooth_scroll_enabled", cssVar: null, inputType: "toggle", default: true, helperText: "Live in preview — anchor/programmatic scrolling" },
  { id: "reducedMotion", label: "Reduced Motion", category: "behavior", studioSection: "motion", level: 1, column: "reduced_motion", cssVar: null, inputType: "toggle", default: false, helperText: "Live in preview — forces the same near-instant motion prefers-reduced-motion gives, regardless of the visitor's OS setting" },
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
