"use server";

import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";

export async function setNewPassword(token: string | undefined, formData: FormData) {
  const password = String(formData.get("password") ?? "");
  const confirm = String(formData.get("confirm") ?? "");
  const destination = token ? `/team/${token}/dashboard` : "/team";

  if (password.length < 8) {
    redirect(`/team/reset-password?token=${token ?? ""}&error=short`);
  }
  if (password !== confirm) {
    redirect(`/team/reset-password?token=${token ?? ""}&error=mismatch`);
  }

  const supabase = createClient();
  const { error } = await supabase.auth.updateUser({ password });

  if (error) {
    redirect(`/team/reset-password?token=${token ?? ""}&error=1`);
  }

  redirect(destination);
}
