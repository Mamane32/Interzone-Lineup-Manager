import { LEVEL_1_TOKENS, platformBrandingFieldForToken, type ThemeToken } from "@/lib/theme-tokens";
import { hexToRgbTriplet } from "@/lib/color-utils";
import type { PlatformBranding } from "@/lib/branding";

/**
 * Client-side bridge between the Brand Studio's in-memory draft state and
 * the shapes real production components expect. Deliberately has no
 * import from lib/branding.ts's runtime exports (that module starts with
 * `import "server-only"` and would break the client bundle) — only a
 * type-only import, which TypeScript erases before bundling. The
 * type-erased `PlatformBranding` import above is safe for exactly that
 * reason.
 *
 * The draft itself is keyed by ThemeToken `id` (lib/theme-tokens.ts),
 * matching what ControlPanel reads/writes and what a future JSON preset
 * export/import will serialize — never by PlatformBranding's field
 * names, which is why platformBrandingFieldForToken exists.
 */
export type BrandDraft = Record<string, string | number | boolean | null | undefined>;

/** Seeds a draft from the currently-saved branding (server-fetched, passed down by app/admin/brand-studio/page.tsx) — every Level 1 token gets an initial value so ControlPanel never renders an uncontrolled input. */
export function draftFromPlatformBranding(saved: PlatformBranding): BrandDraft {
  const asRecord = saved as unknown as Record<string, unknown>;
  const draft: BrandDraft = {};
  for (const token of LEVEL_1_TOKENS) {
    const field = platformBrandingFieldForToken(token.id);
    const value = asRecord[field];
    draft[token.id] = (value === undefined ? token.default : value) as BrandDraft[string];
  }
  return draft;
}

/**
 * Merges a draft over the saved PlatformBranding it started from,
 * producing the full shape real components (BrandMark, AppShell,
 * BroadcastHeader) expect for their `branding`/`platform` props. Used by
 * LivePreview so every preview tab renders with the same resolved
 * identity the real app would show once Save has been confirmed.
 */
export function draftToPlatformBranding(draft: BrandDraft, base: PlatformBranding): PlatformBranding {
  const result = { ...base } as unknown as Record<string, unknown>;
  for (const token of LEVEL_1_TOKENS) {
    if (!(token.id in draft)) continue;
    const value = draft[token.id];
    if (value === undefined) continue;
    result[platformBrandingFieldForToken(token.id)] = value;
  }
  return result as unknown as PlatformBranding;
}

/** The CSS custom property map ThemeScope needs to make a draft visible on real components — same logic as lib/branding.ts's platformBrandingToCssVars, operating directly on the token-id-keyed draft instead of round-tripping through a PlatformBranding object. */
export function draftToCssVars(draft: BrandDraft): Record<string, string> {
  const vars: Record<string, string> = {};
  for (const token of LEVEL_1_TOKENS) {
    if (!token.cssVar) continue;
    const value = draft[token.id];
    if (value === null || value === undefined || value === "") continue;
    if (token.inputType === "color" && typeof value === "string") {
      vars[token.cssVar] = value;
      vars[`${token.cssVar}-rgb`] = hexToRgbTriplet(value);
    } else if (typeof value === "boolean") {
      // "1"/"0", not "true"/"false" — every boolean-toggle cssVar is
      // multiplied into a calc() expression (see app/globals.css's Motion
      // rules), which only accepts a real <number>.
      vars[token.cssVar] = value ? "1" : "0";
    } else {
      vars[token.cssVar] = typeof value === "number" ? `${value}${token.unit ?? "px"}` : String(value);
    }
  }
  return vars;
}

/** True if `value` is a syntactically valid #rrggbb hex color — the same rule the Server Action (app/admin/brand-studio/actions.ts) enforces before persisting, kept here too so the Control Panel can flag an invalid value before Save is even clicked. */
export function isValidHexColor(value: unknown): value is string {
  return typeof value === "string" && /^#[0-9a-fA-F]{6}$/.test(value);
}

/** Builds `{ tokenId: currentValue }` for every token in a given list — used to snapshot a section's values before a Reset Section, so Undo can restore exactly what was there. */
export function snapshotTokens(draft: BrandDraft, tokens: ThemeToken[]): BrandDraft {
  const snapshot: BrandDraft = {};
  for (const token of tokens) snapshot[token.id] = draft[token.id];
  return snapshot;
}
