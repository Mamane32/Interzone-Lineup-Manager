"use server";

import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { requireCoach } from "@/lib/coach-auth";

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
