"use server";

import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { classifyResetError } from "@/lib/auth-rate-limit";

export async function requestPasswordReset(token: string, formData: FormData) {
  const email = String(formData.get("email") ?? "").trim();

  if (email) {
    const supabase = createClient();
    const appUrl = (process.env.NEXT_PUBLIC_APP_URL ?? "").replace(/\/$/, "");
    const next = encodeURIComponent(`/team/reset-password?token=${encodeURIComponent(token)}`);

    const { error } = await supabase.auth.resetPasswordForEmail(email, {
      redirectTo: `${appUrl}/auth/callback?next=${next}`,
    });

    // Same fix as the unified login's forgot-password action: a rate
    // limit or send failure must not be reported as "sent" — that was the
    // exact dead end (no email, no indication why, no way to tell it
    // apart from a real send).
    const classification = classifyResetError(error);
    if (classification) {
      redirect(`/team/${token}/forgot-password?error=${classification}`);
    }
  }

  // Always the same response otherwise — never reveal whether an email is
  // actually registered.
  redirect(`/team/${token}/forgot-password?sent=1`);
}
