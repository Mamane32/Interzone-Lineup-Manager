"use server";

import { redirect } from "next/navigation";
import { requireAdmin } from "@/lib/access";
import { revalidatePath } from "next/cache";
import { supabaseAdmin } from "@/lib/supabase-admin";

export async function createMatch(formData: FormData) {
  await requireAdmin();
  const str = (name: string) => String(formData.get(name) ?? "").trim() || null;

  const competition_id = str("competition_id");
  const round = str("round");
  const home_team_id = String(formData.get("home_team_id") ?? "");
  const away_team_id = String(formData.get("away_team_id") ?? "");
  const match_date = String(formData.get("match_date") ?? "");
  const match_time = String(formData.get("match_time") ?? "");
  // Only the most specific level a user picks needs to be sent — the
  // matches_check_hierarchy trigger (migration 008) backfills every less
  // specific ancestor (group -> stage -> division -> season -> competition)
  // and rejects a combination that doesn't actually nest correctly.
  const season_id = str("season_id");
  const division_id = str("division_id");
  const stage_id = str("stage_id");
  const group_id = str("group_id");
  const venue_id = str("venue_id");

  if (!home_team_id || !away_team_id || home_team_id === away_team_id) return;
  if (!match_date || !match_time) return;

  const supabase = supabaseAdmin();
  const { error } = await supabase.from("matches").insert({
    competition_id,
    round,
    home_team_id,
    away_team_id,
    match_date,
    match_time,
    season_id,
    division_id,
    stage_id,
    group_id,
    venue_id,
  });

  if (error) {
    console.error("createMatch failed", error);
    redirect("/admin/matches?error=save-failed");
  }

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
