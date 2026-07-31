"use server";

import { randomUUID } from "node:crypto";
import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { supabaseAdmin } from "@/lib/supabase-admin";
import { requireCoach } from "@/lib/coach-auth";

export type UploadPhotoResult = { ok: true } | { ok: false; error: string };

/**
 * A real upload — mirrors app/admin/teams/actions.ts's uploadLogoIfPresent
 * exactly (same bucket-per-asset-type pattern, same public-read approach),
 * not the Avatar URL text-field pattern Settings uses for admins. Coaches
 * don't have a way to host an image elsewhere, so a URL field wouldn't be
 * usable for this audience the way it is for admins.
 */
export async function uploadCoachPhoto(token: string, formData: FormData): Promise<UploadPhotoResult> {
  const { team } = await requireCoach(token);

  const file = formData.get("photo") as File | null;
  if (!file || file.size === 0) return { ok: false, error: "Chwazi yon foto anvan." };
  if (!file.type.startsWith("image/")) return { ok: false, error: "Fichye a dwe yon imaj." };
  if (file.size > 5 * 1024 * 1024) return { ok: false, error: "Foto a twò gwo (maksimòm 5 Mo)." };

  const admin = supabaseAdmin();
  const ext = file.name.split(".").pop() || "jpg";
  const path = `${randomUUID()}.${ext}`;

  const { error: uploadError } = await admin.storage.from("coach-photos").upload(path, file, {
    contentType: file.type,
    upsert: false,
  });
  if (uploadError) {
    console.error("uploadCoachPhoto failed", uploadError);
    return { ok: false, error: "Nou pa t kapab telechaje foto a." };
  }

  const { data } = admin.storage.from("coach-photos").getPublicUrl(path);
  const { error: updateError } = await admin.from("teams").update({ coach_photo_url: data.publicUrl }).eq("id", team.id);
  if (updateError) {
    console.error("uploadCoachPhoto: team update failed", updateError);
    return { ok: false, error: "Nou pa t kapab sove foto a." };
  }

  revalidatePath(`/team/${token}/profile`);
  revalidatePath(`/team/${token}/dashboard`);
  return { ok: true };
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
