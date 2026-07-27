"use server";

import { randomUUID } from "node:crypto";
import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { supabaseAdmin } from "@/lib/supabase-admin";
import { generateTeamToken } from "@/lib/token";

async function uploadLogoIfPresent(formData: FormData): Promise<string | null> {
  const file = formData.get("logo") as File | null;
  if (!file || file.size === 0) return null;

  const supabase = supabaseAdmin();
  const ext = file.name.split(".").pop() || "png";
  const path = `${randomUUID()}.${ext}`;

  const { error } = await supabase.storage.from("team-logos").upload(path, file, {
    contentType: file.type || "image/png",
    upsert: false,
  });
  if (error) return null;

  const { data } = supabase.storage.from("team-logos").getPublicUrl(path);
  return data.publicUrl;
}

export async function createTeam(formData: FormData) {
  const supabase = supabaseAdmin();

  const name = String(formData.get("name") ?? "").trim();
  const coach_name = String(formData.get("coach_name") ?? "").trim();
  const coach_phone = String(formData.get("coach_phone") ?? "").trim();
  const coach_email = String(formData.get("coach_email") ?? "").trim() || null;
  const competition_id = String(formData.get("competition_id") ?? "") || null;

  if (!name || !coach_name || !coach_phone || !coach_email) return;

  const logo_url = await uploadLogoIfPresent(formData);

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
  const supabase = supabaseAdmin();

  const name = String(formData.get("name") ?? "").trim();
  const coach_name = String(formData.get("coach_name") ?? "").trim();
  const coach_phone = String(formData.get("coach_phone") ?? "").trim();
  const coach_email = String(formData.get("coach_email") ?? "").trim() || null;
  const competition_id = String(formData.get("competition_id") ?? "") || null;

  if (!name || !coach_name || !coach_phone || !coach_email) return;

  const logo_url = await uploadLogoIfPresent(formData);

  const update: Record<string, unknown> = {
    name,
    coach_name,
    coach_phone,
    coach_email,
    competition_id,
  };
  if (logo_url) update.logo_url = logo_url;

  await supabase.from("teams").update(update).eq("id", id);
  revalidatePath("/admin/teams");
  revalidatePath(`/admin/teams/${id}`);
}

export async function deleteTeam(id: string) {
  const supabase = supabaseAdmin();
  await supabase.from("teams").delete().eq("id", id);
  revalidatePath("/admin/teams");
  redirect("/admin/teams");
}
