"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { supabaseAdmin } from "@/lib/supabase-admin";

/**
 * Provisions (or re-invites) the coach's login for the new Coach Portal.
 * This does NOT add any new tables — it uses Supabase Auth's built-in user
 * store plus the team's existing coach_email column as the link between
 * "this login" and "this team" (checked in lib/coach-auth.ts on every
 * protected coach page). The invited coach clicks the emailed link, lands
 * on /team/reset-password, and sets their own password there.
 */
export async function inviteCoach(teamId: string) {
  const supabase = supabaseAdmin();
  const { data: team } = await supabase.from("teams").select("*").eq("id", teamId).single();

  if (!team?.coach_email) {
    redirect(`/admin/teams/${teamId}?invite=missing-email`);
  }

  const appUrl = (process.env.NEXT_PUBLIC_APP_URL ?? "").replace(/\/$/, "");
  const next = encodeURIComponent(`/team/reset-password?token=${team.token}`);

  const { error } = await supabase.auth.admin.inviteUserByEmail(team.coach_email, {
    redirectTo: `${appUrl}/auth/callback?next=${next}`,
  });

  revalidatePath(`/admin/teams/${teamId}`);
  redirect(`/admin/teams/${teamId}?invite=${error ? "failed" : "sent"}`);
}

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
