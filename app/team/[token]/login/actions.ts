"use server";

import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { supabaseAdmin } from "@/lib/supabase-admin";

export async function coachLogin(token: string, formData: FormData) {
  const email = String(formData.get("email") ?? "").trim();
  const password = String(formData.get("password") ?? "");

  const supabase = createClient();
  const { error } = await supabase.auth.signInWithPassword({ email, password });

  if (error) {
    redirect(`/team/${token}/login?error=1`);
  }

  // Signing in only proves who they are — confirm the email actually owns
  // *this* team before handing over its dashboard.
  const admin = supabaseAdmin();
  const { data: team } = await admin.from("teams").select("coach_email").eq("token", token).single();

  if (!team || (team.coach_email ?? "").toLowerCase() !== email.toLowerCase()) {
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
