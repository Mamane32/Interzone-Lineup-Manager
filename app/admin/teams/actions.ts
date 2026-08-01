"use server";

import { requireAdmin } from "@/lib/access";
import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { supabaseAdmin } from "@/lib/supabase-admin";
import { generateTeamToken } from "@/lib/token";
import { uploadImage, type ImageUploadResult } from "@/lib/image-upload";

export async function uploadTeamLogo(formData: FormData): Promise<ImageUploadResult> {
  await requireAdmin();
  return uploadImage("team-logos", formData.get("file") as File | null);
}

export async function createTeam(formData: FormData) {
  await requireAdmin();
  const supabase = supabaseAdmin();

  const name = String(formData.get("name") ?? "").trim();
  const coach_name = String(formData.get("coach_name") ?? "").trim();
  const coach_phone = String(formData.get("coach_phone") ?? "").trim();
  const coach_email = String(formData.get("coach_email") ?? "").trim() || null;
  const competition_id = String(formData.get("competition_id") ?? "") || null;
  const logo_url = String(formData.get("logo_url") ?? "").trim() || null;

  if (!name || !coach_name || !coach_phone || !coach_email) return;

  await supabase.from("teams").insert({
    name,
    coach_name,
    coach_phone,
    coach_email,
    competition_id,
    logo_url,
    token: generateTeamToken(),
  });

  revalidatePath("/admin/teams");
}

export async function updateTeam(id: string, formData: FormData) {
  await requireAdmin();
  const supabase = supabaseAdmin();

  const name = String(formData.get("name") ?? "").trim();
  const coach_name = String(formData.get("coach_name") ?? "").trim();
  const coach_phone = String(formData.get("coach_phone") ?? "").trim();
  const coach_email = String(formData.get("coach_email") ?? "").trim() || null;
  const competition_id = String(formData.get("competition_id") ?? "") || null;
  const logo_url = String(formData.get("logo_url") ?? "").trim() || null;

  if (!name || !coach_name || !coach_phone || !coach_email) return;

  await supabase
    .from("teams")
    .update({ name, coach_name, coach_phone, coach_email, competition_id, logo_url })
    .eq("id", id);
  revalidatePath("/admin/teams");
  revalidatePath(`/admin/teams/${id}`);
}

export async function deleteTeam(id: string) {
  await requireAdmin();
  const supabase = supabaseAdmin();
  await supabase.from("teams").delete().eq("id", id);
  revalidatePath("/admin/teams");
  redirect("/admin/teams");
}
