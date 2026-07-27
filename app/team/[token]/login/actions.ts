"use server";

import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { supabaseAdmin } from "@/lib/supabase-admin";

export async function coachLogin(token: string, formData: FormData) {
  const email = String(formData.get("email") ?? "").trim();
  const password = String(formData.get("password") ?? "");

  const supabase = createClient();
  const { error, data } = await supabase.auth.signInWithPassword({ email, password });

  if (error || !data.user) {
    redirect(`/team/${token}/login?error=1`);
  }

  // Signing in only proves who they are — confirm they're actually
  // authorized for *this* team before handing over its dashboard. Checks
  // the same two paths as lib/coach-auth.ts's requireCoach(): a real
  // user_access_assignments row first, the legacy coach_email match as a
  // fallback (see that file for why both exist during the Sprint 1.2
  // transition).
  const admin = supabaseAdmin();
  const { data: team } = await admin.from("teams").select("id, coach_email").eq("token", token).single();

  if (!team) {
    await supabase.auth.signOut();
    redirect(`/team/${token}/login?error=forbidden`);
  }

  const { data: assignment } = await admin
    .from("user_access_assignments")
    .select("id")
    .eq("user_id", data.user.id)
    .eq("role_key", "coach")
    .eq("team_id", team.id)
    .eq("status", "active")
    .maybeSingle();

  const hasAssignment = !!assignment;
  const hasLegacyEmailMatch = !!team.coach_email && team.coach_email.toLowerCase() === email.toLowerCase();

  if (!hasAssignment && !hasLegacyEmailMatch) {
    await supabase.auth.signOut();
    redirect(`/team/${token}/login?error=forbidden`);
  }

  redirect(`/team/${token}/dashboard`);
}

export async function coachLogout(token: string) {
  const supabase = createClient();
  await supabase.auth.signOut();
  redirect(`/team/${token}/login`);
}
