import "server-only";
import { supabaseAdmin } from "@/lib/supabase-admin";

/**
 * Platform Branding's Version History (migration 032). One row per
 * confirmed Publish — a full snapshot of every Level 1 token's value at
 * that moment, plus who published it, when, and an optional note. Kept
 * deliberately separate from lib/branding.ts (already large) since this
 * is purely about the history log, not the live/resolved branding read
 * path.
 */
export interface PlatformBrandingVersion {
  id: string;
  data: Record<string, unknown>;
  note: string | null;
  publishedBy: string | null;
  publishedAt: string;
}

/** Most recent versions first — capped at `limit` since this platform could accumulate hundreds of publishes over time and the Studio only ever shows a scrollable recent list, never the full history at once. */
export async function listPlatformBrandingVersions(limit = 25): Promise<PlatformBrandingVersion[]> {
  try {
    const admin = supabaseAdmin();
    const { data, error } = await admin
      .from("platform_branding_versions")
      .select("id, data, note, published_by, published_at")
      .order("published_at", { ascending: false })
      .limit(limit);
    if (error || !data) return [];
    return data.map((row) => ({
      id: row.id as string,
      data: (row.data ?? {}) as Record<string, unknown>,
      note: (row.note as string | null) ?? null,
      publishedBy: (row.published_by as string | null) ?? null,
      publishedAt: row.published_at as string,
    }));
  } catch (err) {
    console.error("listPlatformBrandingVersions failed", err);
    return [];
  }
}

/** Inserts one snapshot — called by savePlatformBranding right before it writes the new values live, so every version row represents a real, confirmed publish (never a draft-in-progress or an autosave). */
export async function recordPlatformBrandingVersion(data: Record<string, unknown>, note: string | null, publishedBy: string): Promise<void> {
  const admin = supabaseAdmin();
  const { error } = await admin.from("platform_branding_versions").insert({ data, note, published_by: publishedBy });
  if (error) console.error("recordPlatformBrandingVersion failed", error);
}

/** Fetches one version's full snapshot, for "Restore" — the caller loads this into the Studio's in-memory draft for review, never applies it directly, so restoring is subject to the exact same Publish confirmation as any other change. */
export async function getPlatformBrandingVersion(versionId: string): Promise<PlatformBrandingVersion | null> {
  try {
    const admin = supabaseAdmin();
    const { data, error } = await admin
      .from("platform_branding_versions")
      .select("id, data, note, published_by, published_at")
      .eq("id", versionId)
      .maybeSingle();
    if (error || !data) return null;
    return {
      id: data.id as string,
      data: (data.data ?? {}) as Record<string, unknown>,
      note: (data.note as string | null) ?? null,
      publishedBy: (data.published_by as string | null) ?? null,
      publishedAt: data.published_at as string,
    };
  } catch (err) {
    console.error("getPlatformBrandingVersion failed", err);
    return null;
  }
}
