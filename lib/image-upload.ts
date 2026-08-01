import "server-only";
import { randomUUID } from "node:crypto";
import { supabaseAdmin } from "@/lib/supabase-admin";

const MAX_BYTES = 5 * 1024 * 1024;

export type ImageUploadResult = { ok: true; url: string } | { ok: false; error: string };

/**
 * The one place an image file actually reaches Supabase Storage — every
 * per-entity upload action (organization logo/banner, competition logo,
 * venue photo, team logo, coach photo, user avatar) calls this instead of
 * repeating the same validate/name/upload/getPublicUrl sequence. Deliberately
 * has no permission check of its own: the caller's Server Action already
 * gated the request (requireFoundationAccess, requireAdmin, requireCoach —
 * whichever fits that entity), matching how lib/tactical-formation.ts and
 * lib/formation-engine.ts trust their callers instead of re-checking a role
 * they have no way to know here.
 */
export async function uploadImage(bucket: string, file: File | null): Promise<ImageUploadResult> {
  if (!file || file.size === 0) return { ok: false, error: "No file selected." };
  if (!file.type.startsWith("image/")) return { ok: false, error: "Only image files are allowed." };
  if (file.size > MAX_BYTES) return { ok: false, error: "Image must be smaller than 5MB." };

  const supabase = supabaseAdmin();
  const ext = file.name.split(".").pop()?.toLowerCase() || "png";
  const path = `${randomUUID()}.${ext}`;

  const { error } = await supabase.storage.from(bucket).upload(path, file, {
    contentType: file.type,
    upsert: false,
  });
  if (error) {
    console.error(`uploadImage failed (bucket=${bucket})`, error);
    return { ok: false, error: "Upload failed. Try again." };
  }

  const { data } = supabase.storage.from(bucket).getPublicUrl(path);
  return { ok: true, url: data.publicUrl };
}
