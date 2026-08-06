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
 *
 * PlatformBrandAsset (Sprint 3, White-Label Branding) is the one category
 * that isn't one-bucket-per-entity-type — the Brand Studio's nine Level 1
 * logo/icon variants (Main, Small, Header, Login, Loading, Splash,
 * Favicon, Browser Icon, Placeholder) all share the single
 * `platform-brand-assets` bucket, namespaced by `entityId` (the variant's
 * own slug, e.g. "main-logo") the same way CoachPhoto/UserAvatar already
 * namespace by their entity's id — see uploadPlatformBrandAsset in
 * app/admin/brand-studio/actions.ts.
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
  PlatformBrandAsset: "platform-brand-asset",
} as const;

export type AssetCategory = (typeof ASSET_CATEGORIES)[keyof typeof ASSET_CATEGORIES];

/**
 * The only place an AssetCategory resolves to an actual Supabase Storage
 * bucket id. Bucket ids are the ones created by
 * supabase/schema.sql and supabase/migrations/010, 012, 017, 026 — plural,
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
  [ASSET_CATEGORIES.PlatformBrandAsset]: "platform-brand-assets",
};

export type ImageUploadResult = { ok: true; url: string } | { ok: false; error: string };

/**
 * The shared asset service — the one place any file actually reaches or is
 * read back from Supabase Storage. Every per-entity upload action
 * (organization logo/banner, competition logo, venue photo, team logo,
 * coach photo, user avatar, platform brand assets, and — Sprint 3 —
 * sponsor logos, official photos, general competition assets) calls this
 * instead of repeating the same validate/name/upload/getPublicUrl
 * sequence, and passes a typed AssetCategory, never a bucket string. All
 * future modules needing file storage should consume this module rather
 * than writing their own Supabase Storage calls or hardcoding a bucket
 * name.
 *
 * uploadImage has no permission check of its own: the caller's Server
 * Action already gated the request (requireFoundationAccess, requireAdmin,
 * requireCoach, requirePlatformBrandingWrite — whichever fits that
 * entity), matching how lib/tactical-formation.ts and
 * lib/formation-engine.ts trust their callers instead of re-checking a
 * role they have no way to know here.
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
  // PDF alongside images: brand kits often ship a vector logo as PDF, and
  // this is the one shared path every category's upload flows through.
  // Harmless to allow everywhere — every other category's file picker
  // still only offers "image/*", so this only actually matters for
  // PlatformBrandAsset, whose picker explicitly adds it (see
  // components/brand-studio/AssetManager.tsx).
  if (!file.type.startsWith("image/") && file.type !== "application/pdf") {
    return { ok: false, error: "Only image or PDF files are allowed." };
  }
  if (file.size > MAX_BYTES) return { ok: false, error: "File must be smaller than 5MB." };

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

/**
 * Deletes every object namespaced under `<entityId>/` in a category's
 * bucket. Used by Brand Studio asset deletion (a "Delete" on a logo
 * variant should actually free the storage, not just clear the DB
 * column) — first list()s the namespace since Supabase Storage's
 * remove() needs full object paths, not a folder prefix.
 */
export async function deleteImagesForEntity(category: AssetCategory, entityId: string): Promise<{ ok: true } | { ok: false; error: string }> {
  const bucket = BUCKET_BY_CATEGORY[category];
  const supabase = supabaseAdmin();
  const { data: objects, error: listError } = await supabase.storage.from(bucket).list(entityId);
  if (listError) {
    console.error(`deleteImagesForEntity list failed (category=${category})`, listError);
    return { ok: false, error: "Could not locate the file to delete." };
  }
  if (!objects || objects.length === 0) return { ok: true };

  const paths = objects.filter((o) => o.id !== null).map((o) => `${entityId}/${o.name}`);
  if (paths.length === 0) return { ok: true };

  const { error } = await supabase.storage.from(bucket).remove(paths);
  if (error) {
    console.error(`deleteImagesForEntity remove failed (category=${category})`, error);
    return { ok: false, error: "Delete failed. Try again." };
  }
  return { ok: true };
}

/** Deletes exactly one stored object identified by its public URL — for galleries (e.g. competition sponsor logos) where removing one item must not touch its siblings, unlike deleteImagesForEntity's whole-namespace sweep. No-op (not an error) if the URL doesn't look like it belongs to this category's bucket. */
export async function deleteImageByUrl(category: AssetCategory, url: string): Promise<{ ok: true } | { ok: false; error: string }> {
  const bucket = BUCKET_BY_CATEGORY[category];
  const marker = `/object/public/${bucket}/`;
  const idx = url.indexOf(marker);
  if (idx === -1) return { ok: true };
  const path = decodeURIComponent(url.slice(idx + marker.length));
  const supabase = supabaseAdmin();
  const { error } = await supabase.storage.from(bucket).remove([path]);
  if (error) {
    console.error(`deleteImageByUrl failed (category=${category})`, error);
    return { ok: false, error: "Delete failed. Try again." };
  }
  return { ok: true };
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
