"use server";

import { revalidatePath } from "next/cache";
import { supabaseAdmin } from "@/lib/supabase-admin";
import { recordAuditEvent } from "@/lib/audit";
import { uploadImage, deleteImageByUrl, deleteImagesForEntity, ASSET_CATEGORIES, type ImageUploadResult } from "@/lib/image-upload";
import { requireCompetitionBrandingWrite } from "@/lib/branding-permissions";
import { LEVEL_2_TOKENS } from "@/lib/theme-tokens";
import type { CompetitionBranding } from "@/lib/branding";

export type ActionResult = { ok: true } | { ok: false; error: string };

/** Every path that could render this competition's resolved branding (Broadcast Control Room, its public pages) plus this branding screen itself. */
function revalidateCompetitionBranding(competitionId: string) {
  revalidatePath(`/admin/competitions/${competitionId}/branding`);
  revalidatePath("/admin/competitions");
  revalidatePath("/live", "layout");
  revalidatePath("/competition", "layout");
}

/**
 * Builds a { column: value } patch for every Level 2 token present in
 * `draft`. Unlike Level 1's draftToColumnPatch (app/admin/brand-studio/
 * actions.ts), every competitions.* branding column is nullable and
 * `null` is itself a meaningful, valid value here — it's "reset to
 * inherited," not a dropped/invalid field — so null always passes
 * through unchanged, and only a *non-null* value gets the normal
 * per-inputType validation.
 */
function draftToColumnPatch(draft: Record<string, unknown>): Record<string, unknown> {
  const patch: Record<string, unknown> = {};
  for (const token of LEVEL_2_TOKENS) {
    if (!(token.id in draft)) continue;
    const value = draft[token.id];
    if (value === null || value === "") {
      patch[token.column] = null;
      continue;
    }
    if (token.inputType === "color") {
      if (typeof value === "string" && /^#[0-9a-fA-F]{6}$/.test(value)) patch[token.column] = value;
    } else if (typeof value === "string") {
      patch[token.column] = value;
    }
  }
  return patch;
}

/**
 * Persists a competition's Level 2 draft to its `competitions` row.
 * Gated per-competition by requireCompetitionBrandingWrite — a Platform
 * Owner may save any competition, a Competition Administrator only the
 * competitions they're assigned to.
 */
export async function saveCompetitionBranding(competitionId: string, draft: Record<string, unknown>): Promise<ActionResult> {
  const access = await requireCompetitionBrandingWrite(competitionId);
  const patch = draftToColumnPatch(draft);
  if (Object.keys(patch).length === 0) return { ok: false, error: "Nothing to save." };

  const admin = supabaseAdmin();
  const { error } = await admin.from("competitions").update(patch).eq("id", competitionId);
  if (error) {
    console.error("saveCompetitionBranding failed", competitionId, error);
    return { ok: false, error: "Save failed. Try again." };
  }

  await recordAuditEvent({
    actorUserId: access.userId,
    action: "competition_branding.saved",
    targetType: "competition",
    targetId: competitionId,
    metadata: { fields: Object.keys(patch) },
  });

  revalidateCompetitionBranding(competitionId);
  return { ok: true };
}

/** Uploads one of the four Level 2 image variants (Logo/Banner/Background/Watermark). Namespaced per competition+variant so Replace only ever touches that one variant's files, never another variant's or another competition's. Doesn't itself write to `competitions` — the Studio calls saveCompetitionBranding separately once the admin confirms, matching Level 1's upload/save split. */
export async function uploadCompetitionBrandAsset(competitionId: string, variantId: string, formData: FormData): Promise<ImageUploadResult> {
  await requireCompetitionBrandingWrite(competitionId);
  const file = formData.get("file") as File | null;
  const category = variantId === "competitionLogo" ? ASSET_CATEGORIES.CompetitionLogo : ASSET_CATEGORIES.CompetitionAsset;
  return uploadImage(category, file, `${competitionId}-${variantId}`);
}

/** Immediate, already-confirmed delete of one Level 2 image variant — frees the stored file and clears the column right away rather than waiting for Save, matching Level 1's deletePlatformBrandAsset. */
export async function deleteCompetitionBrandAsset(competitionId: string, variantId: string, column: string): Promise<ActionResult> {
  const access = await requireCompetitionBrandingWrite(competitionId);
  const validColumn = LEVEL_2_TOKENS.some((t) => t.column === column && t.inputType === "image");
  if (!validColumn) return { ok: false, error: "Unknown asset field." };

  const category = variantId === "competitionLogo" ? ASSET_CATEGORIES.CompetitionLogo : ASSET_CATEGORIES.CompetitionAsset;
  await deleteImagesForEntity(category, `${competitionId}-${variantId}`);

  const admin = supabaseAdmin();
  const { error } = await admin.from("competitions").update({ [column]: null }).eq("id", competitionId);
  if (error) {
    console.error("deleteCompetitionBrandAsset failed", competitionId, variantId, error);
    return { ok: false, error: "Delete failed. Try again." };
  }

  await recordAuditEvent({
    actorUserId: access.userId,
    action: "competition_branding.asset_deleted",
    targetType: "competition",
    targetId: competitionId,
    metadata: { variantId, column },
  });

  revalidateCompetitionBranding(competitionId);
  return { ok: true };
}

export type SponsorLogoResult = { ok: true; logo: CompetitionBranding["sponsorLogos"][number] } | { ok: false; error: string };

/** Adds one logo to the competition's sponsor gallery — appended after every existing logo (max existing sort_order + 1), so new sponsors land at the end rather than needing a manual reorder every time. */
export async function addCompetitionSponsorLogo(competitionId: string, formData: FormData): Promise<SponsorLogoResult> {
  await requireCompetitionBrandingWrite(competitionId);
  const file = formData.get("file") as File | null;
  const sponsorName = (formData.get("sponsorName") as string | null)?.trim() || null;

  const uploaded = await uploadImage(ASSET_CATEGORIES.SponsorLogo, file, competitionId);
  if (!uploaded.ok) return uploaded;

  const admin = supabaseAdmin();
  const { data: existing } = await admin.from("competition_sponsor_logos").select("sort_order").eq("competition_id", competitionId).order("sort_order", { ascending: false }).limit(1);
  const nextSortOrder = existing && existing.length > 0 ? (existing[0].sort_order as number) + 1 : 0;

  const { data, error } = await admin
    .from("competition_sponsor_logos")
    .insert({ competition_id: competitionId, logo_url: uploaded.url, sponsor_name: sponsorName, sort_order: nextSortOrder })
    .select("id, logo_url, sponsor_name, sort_order")
    .single();
  if (error || !data) {
    console.error("addCompetitionSponsorLogo insert failed", competitionId, error);
    return { ok: false, error: "Could not save the sponsor logo. Try again." };
  }

  revalidateCompetitionBranding(competitionId);
  return { ok: true, logo: { id: data.id, logoUrl: data.logo_url, sponsorName: data.sponsor_name, sortOrder: data.sort_order } };
}

/** Removes one sponsor logo — both the DB row and its stored file (deleteImageByUrl targets only this one object, never its siblings in the shared per-competition sponsor-logos namespace). */
export async function removeCompetitionSponsorLogo(competitionId: string, sponsorLogoId: string): Promise<ActionResult> {
  await requireCompetitionBrandingWrite(competitionId);
  const admin = supabaseAdmin();

  const { data: row } = await admin.from("competition_sponsor_logos").select("logo_url").eq("id", sponsorLogoId).eq("competition_id", competitionId).maybeSingle();
  const { error } = await admin.from("competition_sponsor_logos").delete().eq("id", sponsorLogoId).eq("competition_id", competitionId);
  if (error) {
    console.error("removeCompetitionSponsorLogo failed", competitionId, sponsorLogoId, error);
    return { ok: false, error: "Delete failed. Try again." };
  }
  if (row?.logo_url) await deleteImageByUrl(ASSET_CATEGORIES.SponsorLogo, row.logo_url as string);

  revalidateCompetitionBranding(competitionId);
  return { ok: true };
}
