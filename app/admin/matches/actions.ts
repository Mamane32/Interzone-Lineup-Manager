"use server";

import { requireAdmin } from "@/lib/access";
import { revalidatePath } from "next/cache";
import { supabaseAdmin } from "@/lib/supabase-admin";

export async function createMatch(formData: FormData) {
  await requireAdmin();
  const competition_id = String(formData.get("competition_id") ?? "") || null;
  const round = String(formData.get("round") ?? "").trim() || null;
  const home_team_id = String(formData.get("home_team_id") ?? "");
  const away_team_id = String(formData.get("away_team_id") ?? "");
  const match_date = String(formData.get("match_date") ?? "");
  const match_time = String(formData.get("match_time") ?? "");

  if (!home_team_id || !away_team_id || home_team_id === away_team_id) return;
  if (!match_date || !match_time) return;

  const supabase = supabaseAdmin();
  await supabase.from("matches").insert({
    competition_id,
    round,
    home_team_id,
    away_team_id,
    match_date,
    match_time,
  });

  revalidatePath("/admin/matches");
  revalidatePath("/admin/dashboard");
  revalidatePath("/admin/lineups");
}

export async function deleteMatch(id: string) {
  await requireAdmin();
  const supabase = supabaseAdmin();
  await supabase.from("matches").delete().eq("id", id);
  revalidatePath("/admin/matches");
  revalidatePath("/admin/dashboard");
  revalidatePath("/admin/lineups");
}
