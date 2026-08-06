import { LEVEL_2_TOKENS, competitionBrandingFieldForToken } from "@/lib/theme-tokens";
import type { CompetitionBranding } from "@/lib/branding";
import { draftFromPlatformBranding, type BrandDraft } from "./draft-utils";
import type { PlatformBranding } from "@/lib/branding";

/**
 * Level 2 counterpart to draft-utils.ts's Level 1 helpers — same
 * token-id-keyed BrandDraft shape (so ControlPanel's TokenField and
 * BrandStudio's undo/redo/draft machinery work unchanged for Level 2),
 * just seeded from/written back to a `CompetitionBranding` instead of a
 * `PlatformBranding`. No "server-only" dependency here either, for the
 * same reason draft-utils.ts has none: this runs in the Competition Brand
 * Studio's client bundle.
 *
 * Every field here is nullable by design (CompetitionBranding's own
 * contract — "unset means inherit platform branding, not blank"), so
 * unlike Level 1's draft (which always carries a real value, defaulting
 * to the registry's `default`), a Level 2 draft value can legitimately be
 * `null` — that null is not a placeholder for "not loaded yet," it means
 * "this competition doesn't override this field."
 */
export function draftFromCompetitionBranding(saved: CompetitionBranding): BrandDraft {
  const asRecord = saved as unknown as Record<string, unknown>;
  const draft: BrandDraft = {};
  for (const token of LEVEL_2_TOKENS) {
    const field = competitionBrandingFieldForToken(token.id);
    draft[token.id] = (asRecord[field] ?? null) as BrandDraft[string];
  }
  return draft;
}

/**
 * Builds a Level 1-shaped preview draft: the platform's own current
 * values, with this competition's real, wired overrides layered on top —
 * the exact same four fields lib/branding.ts's resolveEffectiveBranding()
 * actually resolves in production (organizationName/logoUrl/primaryColor/
 * accentColor), so LivePreview/PreviewSurface (Level 1's own preview
 * pipeline) can render "how this competition looks" with zero new preview
 * code. The other six Level 2 fields have no live target yet (see each
 * token's "Reserved" helperText in lib/theme-tokens.ts), so there's
 * nothing they'd change in this preview even if included.
 */
export function competitionDraftToPreviewDraft(competitionDraft: BrandDraft, platform: PlatformBranding): BrandDraft {
  const base = draftFromPlatformBranding(platform);
  const name = competitionDraft.competitionName;
  const logo = competitionDraft.competitionLogo;
  const theme = competitionDraft.competitionThemeColor;
  const accent = competitionDraft.competitionAccentColor;
  return {
    ...base,
    ...(typeof name === "string" && name ? { platformName: name } : {}),
    ...(typeof logo === "string" && logo ? { mainLogo: logo } : {}),
    ...(typeof theme === "string" && theme ? { primaryColor: theme } : {}),
    ...(typeof accent === "string" && accent ? { accentColor: accent } : {}),
  };
}
