"use server";

import { revalidatePath } from "next/cache";
import { supabaseAdmin } from "@/lib/supabase-admin";

export async function createCompetition(formData: FormData) {
  const name = String(formData.get("name") ?? "").trim();
  if (!name) return;

  const supabase = supabaseAdmin();
  await supabase.from("competitions").insert({ name });
  revalidatePath("/admin/competitions");
}

export async function renameCompetition(id: string, formData: FormData) {
  const name = String(formData.get("name") ?? "").trim();
  if (!name) return;

  const supabase = supabaseAdmin();
  await supabase.from("competitions").update({ name }).eq("id", id);
  revalidatePath("/admin/competitions");
}

export async function deleteCompetition(id: string) {
  const supabase = supabaseAdmin();
  await supabase.from("competitions").delete().eq("id", id);
  revalidatePath("/admin/competitions");
}
