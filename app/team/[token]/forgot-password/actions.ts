"use server";

import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";

export async function requestPasswordReset(token: string, formData: FormData) {
  const email = String(formData.get("email") ?? "").trim();

  if (email) {
    const supabase = createClient();
    const appUrl = (process.env.NEXT_PUBLIC_APP_URL ?? "").replace(/\/$/, "");
    const next = encodeURIComponent(`/team/reset-password?token=${encodeURIComponent(token)}`);

    await supabase.auth.resetPasswordForEmail(email, {
      redirectTo: `${appUrl}/auth/callback?next=${next}`,
    });
  }

  // Always redirect to the same "check your email" state — never reveal
  // whether an email is actually registered.
  redirect(`/team/${token}/forgot-password?sent=1`);
}
