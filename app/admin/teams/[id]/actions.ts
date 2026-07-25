"use server";

import { revalidatePath } from "next/cache";
import { supabaseAdmin } from "@/lib/supabase-admin";

export async function addPlayer(teamId: string, formData: FormData) {
  const number = Number(formData.get("number"));
  const full_name = String(formData.get("full_name") ?? "").trim();
  if (!number || !full_name) return;

  const supabase = supabaseAdmin();
  await supabase.from("players").insert({ team_id: teamId, number, full_name });
  revalidatePath(`/admin/teams/${teamId}`);
}

export async function updatePlayer(teamId: string, playerId: string, formData: FormData) {
  const number = Number(formData.get("number"));
  const full_name = String(formData.get("full_name") ?? "").trim();
  if (!number || !full_name) return;

  const supabase = supabaseAdmin();
  await supabase.from("players").update({ number, full_name }).eq("id", playerId);
  revalidatePath(`/admin/teams/${teamId}`);
}

export async function deletePlayer(teamId: string, playerId: string) {
  const supabase = supabaseAdmin();
  await supabase.from("players").delete().eq("id", playerId);
  revalidatePath(`/admin/teams/${teamId}`);
}
