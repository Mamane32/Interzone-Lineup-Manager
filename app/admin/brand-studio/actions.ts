"use server";

import { revalidatePath } from "next/cache";
import { supabaseAdmin } from "@/lib/supabase-admin";
import { recordAuditEvent } from "@/lib/audit";
import { uploadImage, deleteImagesForEntity, ASSET_CATEGORIES, type ImageUploadResult } from "@/lib/image-upload";
import { requirePlatformBrandingWrite } from "@/lib/branding-permissions";
import { LEVEL_1_TOKENS, tokensByStudioSection, type StudioSection } from "@/lib/theme-tokens";
import type { PlatformBranding } from "@/lib/branding";

export type ActionResult = { ok: true } | { ok: false; error: string };

/** Every path that reads getPlatformBranding() somewhere in its render tree — a save/reset must invalidate all of them, not just the Studio's own page, since the whole point of Level 1 branding is that it's read platform-wide. */
function revalidateBrandingEverywhere() {
  revalidatePath("/admin/brand-studio");
  revalidatePath("/admin", "layout");
  revalidatePath("/login");
  revalidatePath("/live", "layout");
  revalidatePath("/", "layout");
}

/** Builds a { column: value } patch for every Level 1 token, reading from `draft` (camelCase, the Studio's in-memory state) with light per-inputType validation — a bad value is dropped in favor of the current default rather than writing garbage to the singleton row. */
function draftToColumnPatch(draft: Record<string, unknown>): Record<string, unknown> {
  const patch: Record<string, unknown> = {};
  for (const token of LEVEL_1_TOKENS) {
    if (!(token.id in draft)) continue;
    const value = draft[token.id];
    if (token.inputType === "color") {
      if (typeof value === "string" && /^#[0-9a-fA-F]{6}$/.test(value)) patch[token.column] = value;
    } else if (token.inputType === "number") {
      const num = typeof value === "number" ? value : Number(value);
      if (Number.isFinite(num) && num >= 0 && num <= 4000) patch[token.column] = Math.round(num);
    } else if (token.inputType === "toggle") {
      patch[token.column] = Boolean(value);
    } else if (token.inputType === "select") {
      if (typeof value === "string" && (!token.options || token.options.includes(value))) patch[token.column] = value;
    } else {
      // text / textarea / image (image URLs are written by the upload actions below, not this bulk save — but a caller passing one through here, e.g. "clear to null", is still honored)
      if (value === null || typeof value === "string") patch[token.column] = value;
    }
  }
  return patch;
}

/**
 * Persists the Brand Studio's full draft state to the platform_branding
 * singleton row. Gated by requirePlatformBrandingWrite() — throws (not
 * redirects) on an unauthorized call, since this is invoked from a client
 * component's fetch to a Server Action, not a form navigation; the client
 * surfaces the thrown error as a toast rather than following a redirect.
 */
export async function savePlatformBranding(draft: Record<string, unknown>): Promise<ActionResult> {
  const access = await requirePlatformBrandingWrite();
  const patch = draftToColumnPatch(draft);
  if (Object.keys(patch).length === 0) return { ok: false, error: "Nothing to save." };

  const admin = supabaseAdmin();
  const { error } = await admin.from("platform_branding").update(patch).eq("id", true);
  if (error) {
    console.error("savePlatformBranding failed", error);
    return { ok: false, error: "Save failed. Try again." };
  }

  await recordAuditEvent({
    actorUserId: access.userId,
    action: "platform_branding.saved",
    targetType: "platform_branding",
    targetId: null,
    metadata: { fields: Object.keys(patch) },
  });

  revalidateBrandingEverywhere();
  return { ok: true };
}

/** Resets every token in one Brand Studio section back to its registry default (lib/theme-tokens.ts) — e.g. "Colors" resets all 13 visual-theme columns, leaving Identity/Typography/Layout/etc. untouched. */
export async function resetPlatformBrandingSection(section: StudioSection): Promise<ActionResult> {
  const access = await requirePlatformBrandingWrite();
  const tokens = tokensByStudioSection(section).filter((t) => t.level === 1);
  if (tokens.length === 0) return { ok: false, error: "Nothing to reset in that section." };

  const patch: Record<string, unknown> = {};
  for (const token of tokens) {
    patch[token.column] = token.default;
  }

  const admin = supabaseAdmin();
  const { error } = await admin.from("platform_branding").update(patch).eq("id", true);
  if (error) {
    console.error("resetPlatformBrandingSection failed", section, error);
    return { ok: false, error: "Reset failed. Try again." };
  }

  await recordAuditEvent({
    actorUserId: access.userId,
    action: "platform_branding.section_reset",
    targetType: "platform_branding",
    targetId: null,
    metadata: { section },
  });

  revalidateBrandingEverywhere();
  return { ok: true };
}

/** Resets every Level 1 field to its registry default (lib/theme-tokens.ts, kept in sync with DEFAULT_PLATFORM_BRANDING) — the platform reverts to its out-of-the-box appearance. Logo/asset URLs are cleared (set to null) rather than having their uploaded files deleted, since a reset is meant to be undoable by re-saving, not a destructive purge; use the Asset Manager's own Delete for that. */
export async function resetAllPlatformBranding(): Promise<ActionResult> {
  const access = await requirePlatformBrandingWrite();
  const patch: Record<string, unknown> = {};
  for (const token of LEVEL_1_TOKENS) {
    patch[token.column] = token.default;
  }

  const admin = supabaseAdmin();
  const { error } = await admin.from("platform_branding").update(patch).eq("id", true);
  if (error) {
    console.error("resetAllPlatformBranding failed", error);
    return { ok: false, error: "Reset failed. Try again." };
  }

  await recordAuditEvent({
    actorUserId: access.userId,
    action: "platform_branding.reset_all",
    targetType: "platform_branding",
    targetId: null,
    metadata: {},
  });

  revalidateBrandingEverywhere();
  return { ok: true };
}

/**
 * Uploads one of the nine Level 1 logo/icon variants. `variantId` is the
 * token id (e.g. "mainLogo", "favicon") — used as the storage entityId
 * namespace (lib/image-upload.ts) so each variant's files live in their
 * own folder within the shared platform-brand-assets bucket. Does not
 * itself write to platform_branding — the Studio calls
 * savePlatformBranding separately once the admin confirms, so an upload
 * previews instantly but isn't persisted until Save (per the "changes
 * update the preview instantly; save persists only after confirmation"
 * requirement).
 */
export async function uploadPlatformBrandAsset(variantId: string, formData: FormData): Promise<ImageUploadResult> {
  await requirePlatformBrandingWrite();
  const file = formData.get("file") as File | null;
  return uploadImage(ASSET_CATEGORIES.PlatformBrandAsset, file, variantId);
}

/** Deletes every stored file for one logo variant and clears its column immediately — unlike upload, Delete is treated as an immediate, confirmed action from the Asset Manager (it already asks the admin to confirm before calling this), not part of the unsaved draft. */
export async function deletePlatformBrandAsset(variantId: string, column: string): Promise<ActionResult> {
  const access = await requirePlatformBrandingWrite();
  const validColumn = LEVEL_1_TOKENS.some((t) => t.column === column && t.inputType === "image");
  if (!validColumn) return { ok: false, error: "Unknown asset field." };

  await deleteImagesForEntity(ASSET_CATEGORIES.PlatformBrandAsset, variantId);

  const admin = supabaseAdmin();
  const { error } = await admin.from("platform_branding").update({ [column]: null }).eq("id", true);
  if (error) {
    console.error("deletePlatformBrandAsset failed", variantId, error);
    return { ok: false, error: "Delete failed. Try again." };
  }

  await recordAuditEvent({
    actorUserId: access.userId,
    action: "platform_branding.asset_deleted",
    targetType: "platform_branding",
    targetId: null,
    metadata: { variantId, column },
  });

  revalidateBrandingEverywhere();
  return { ok: true };
}

export type { PlatformBranding };
