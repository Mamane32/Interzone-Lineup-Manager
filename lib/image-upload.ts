import "server-only";
import { randomUUID } from "node:crypto";
import { supabaseAdmin } from "@/lib/supabase-admin";

const MAX_BYTES = 5 * 1024 * 1024;

/**
 * Every kind of file this app stores, as a typed category — never a raw
 * Storage bucket name. Application code asks for `ASSET_CATEGORIES.TeamLogo`,
 * never `"team-logos"`; this module is the only place that mapping exists.
 * A bucket rename, a CDN change, or a future storage-provider migration
 * touches only BUCKET_BY_CATEGORY below — no caller anywhere else changes.
 */
export const ASSET_CATEGORIES = {
  TeamLogo: "team-logo",
  CompetitionLogo: "competition-logo",
  CompetitionAsset: "competition-asset",
  SponsorLogo: "sponsor-logo",
  OfficialPhoto: "official-photo",
  CoachPhoto: "coach-photo",
  OrganizationLogo: "organization-logo",
  OrganizationBanner: "organization-banner",
  VenuePhoto: "venue-photo",
  UserAvatar: "user-avatar",
  PlayerPhoto: "player-photo",
} as const;

export type AssetCategory = (typeof ASSET_CATEGORIES)[keyof typeof ASSET_CATEGORIES];

/**
 * The only place an AssetCategory resolves to an actual Supabase Storage
 * bucket id. Bucket ids are the ones created by
 * supabase/schema.sql and supabase/migrations/010, 012, 017 — plural,
 * hyphenated, and otherwise unrelated to the category names above by
 * design, so nothing outside this file needs to know or care that they
 * happen to look similar.
 */
const BUCKET_BY_CATEGORY: Record<AssetCategory, string> = {
  [ASSET_CATEGORIES.TeamLogo]: "team-logos",
  [ASSET_CATEGORIES.CompetitionLogo]: "competition-logos",
  [ASSET_CATEGORIES.CompetitionAsset]: "competition-assets",
  [ASSET_CATEGORIES.SponsorLogo]: "sponsor-logos",
  [ASSET_CATEGORIES.OfficialPhoto]: "official-photos",
  [ASSET_CATEGORIES.CoachPhoto]: "coach-photos",
  [ASSET_CATEGORIES.OrganizationLogo]: "organization-logos",
  [ASSET_CATEGORIES.OrganizationBanner]: "organization-banners",
  [ASSET_CATEGORIES.VenuePhoto]: "venue-photos",
  [ASSET_CATEGORIES.UserAvatar]: "user-avatars",
  [ASSET_CATEGORIES.PlayerPhoto]: "player-photos",
};

export type ImageUploadResult = { ok: true; url: string } | { ok: false; error: string };

/**
 * The shared asset service — the one place any file actually reaches or is
 * read back from Supabase Storage. Every per-entity upload action
 * (organization logo/banner, competition logo, venue photo, team logo,
 * coach photo, user avatar, and — Sprint 3 — sponsor logos, official
 * photos, general competition assets) calls this instead of repeating the
 * same validate/name/upload/getPublicUrl sequence, and passes a typed
 * AssetCategory, never a bucket string. All future modules needing file
 * storage should consume this module rather than writing their own
 * Supabase Storage calls or hardcoding a bucket name.
 *
 * uploadImage has no permission check of its own: the caller's Server
 * Action already gated the request (requireFoundationAccess, requireAdmin,
 * requireCoach — whichever fits that entity), matching how
 * lib/tactical-formation.ts and lib/formation-engine.ts trust their callers
 * instead of re-checking a role they have no way to know here.
 *
 * The stored path is always an immutable, server-generated identifier —
 * never the original filename (only its extension is kept, for content
 * type). Only the returned public URL is ever persisted by callers; the
 * original filename is discarded entirely. When the caller already knows
 * which entity this file belongs to (entityId), the path is namespaced
 * `<entityId>/<uuid>.<ext>` instead of a flat `<uuid>.<ext>` — entityId is
 * optional because it genuinely isn't always known yet: several callers
 * (team/venue/organization/competition logo uploads) upload immediately
 * when a file is chosen, before the entity's own create form has even been
 * submitted, so no id exists at upload time for those. See CoachPhoto and
 * UserAvatar's call sites for the namespaced case.
 */
export async function uploadImage(category: AssetCategory, file: File | null, entityId?: string): Promise<ImageUploadResult> {
  if (!file || file.size === 0) return { ok: false, error: "No file selected." };
  if (!file.type.startsWith("image/")) return { ok: false, error: "Only image files are allowed." };
  if (file.size > MAX_BYTES) return { ok: false, error: "Image must be smaller than 5MB." };

  const bucket = BUCKET_BY_CATEGORY[category];
  const supabase = supabaseAdmin();
  const ext = file.name.split(".").pop()?.toLowerCase() || "png";
  const filename = `${randomUUID()}.${ext}`;
  const path = entityId ? `${entityId}/${filename}` : filename;

  const { error } = await supabase.storage.from(bucket).upload(path, file, {
    contentType: file.type,
    upsert: false,
  });
  if (error) {
    console.error(`uploadImage failed (category=${category})`, error);
    return { ok: false, error: "Upload failed. Try again." };
  }

  const { data } = supabase.storage.from(bucket).getPublicUrl(path);
  return { ok: true, url: data.publicUrl };
}

export type StoredAsset = { name: string; url: string; createdAt: string | null; sizeBytes: number | null };
export type ListAssetsResult = { ok: true; assets: StoredAsset[] } | { ok: false; error: string };

/**
 * Retrieval side of the asset service — lists everything currently stored
 * under an AssetCategory, with its public URL. Exists for categories that
 * don't yet have an admin CRUD surface to browse through (Sprint 3's
 * SponsorLogo, OfficialPhoto, CompetitionAsset: storage exists, the entity
 * tables and admin pages that would reference these assets are a later
 * phase) — without this, an imported file would be unverifiable and
 * unreachable until that later phase ships. Pass entityId to list only
 * that entity's own namespaced folder instead of the whole bucket.
 */
export async function listAssets(category: AssetCategory, entityId?: string): Promise<ListAssetsResult> {
  const bucket = BUCKET_BY_CATEGORY[category];
  const supabase = supabaseAdmin();
  const { data, error } = await supabase.storage.from(bucket).list(entityId ?? "", {
    sortBy: { column: "created_at", order: "desc" },
  });

  if (error) {
    console.error(`listAssets failed (category=${category})`, error);
    return { ok: false, error: "Could not list assets." };
  }

  const assets = (data ?? [])
    // Supabase Storage's list() can return a placeholder folder-marker
    // entry with a null id for an empty bucket — not a real object.
    .filter((obj) => obj.id !== null)
    .map((obj) => {
      const objectPath = entityId ? `${entityId}/${obj.name}` : obj.name;
      const { data: urlData } = supabase.storage.from(bucket).getPublicUrl(objectPath);
      return {
        name: obj.name,
        url: urlData.publicUrl,
        createdAt: obj.created_at ?? null,
        sizeBytes: obj.metadata?.size ?? null,
      };
    });

  return { ok: true, assets };
}
