"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { supabaseAdmin } from "@/lib/supabase-admin";
import { requireCoach } from "@/lib/coach-auth";
import { uploadImage, ASSET_CATEGORIES, type ImageUploadResult } from "@/lib/image-upload";

export type UploadPhotoResult = ImageUploadResult;

/** Same shared upload core every other image in the platform uses (lib/image-upload.ts) — only the requireCoach gate and the teams.coach_photo_url persistence step are specific to this call site. */
export async function uploadCoachPhoto(token: string, formData: FormData): Promise<UploadPhotoResult> {
  const { team } = await requireCoach(token);

  const result = await uploadImage(ASSET_CATEGORIES.CoachPhoto, formData.get("photo") as File | null, team.id);
  if (!result.ok) return result;

  const admin = supabaseAdmin();
  const { error: updateError } = await admin.from("teams").update({ coach_photo_url: result.url }).eq("id", team.id);
  if (updateError) {
    console.error("uploadCoachPhoto: team update failed", updateError);
    return { ok: false, error: "Nou pa t kapab sove foto a." };
  }

  revalidatePath(`/team/${token}/profile`);
  revalidatePath(`/team/${token}/dashboard`);
  return result;
}

export async function changePassword(token: string, formData: FormData) {
  await requireCoach(token);
  const password = String(formData.get("password") ?? "");
  const confirm = String(formData.get("confirm") ?? "");

  if (password.length < 8) {
    redirect(`/team/${token}/profile?error=short`);
  }
  if (password !== confirm) {
    redirect(`/team/${token}/profile?error=mismatch`);
  }

  const supabase = createClient();
  const { error } = await supabase.auth.updateUser({ password });

  if (error) {
    redirect(`/team/${token}/profile?error=1`);
  }

  redirect(`/team/${token}/profile?saved=1`);
}
