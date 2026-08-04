"use server";

import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { resolveUserDestination } from "@/lib/access";
import { classifyResetError } from "@/lib/auth-rate-limit";

export async function unifiedLogin(formData: FormData) {
  const email = String(formData.get("email") ?? "").trim();
  const password = String(formData.get("password") ?? "");

  const supabase = createClient();
  const { data, error } = await supabase.auth.signInWithPassword({ email, password });

  if (error || !data.user) {
    redirect("/login?error=invalid");
  }

  const resolution = await resolveUserDestination(data.user.id);

  if (resolution.kind === "redirect") {
    redirect(resolution.path);
  }
  if (resolution.kind === "select-workspace") {
    redirect("/select-workspace");
  }

  // "denied" — leave the session as-is (they did authenticate correctly)
  // but send them to a clear, specific message instead of any workspace.
  redirect(`/login?error=${resolution.reason}`);
}

export async function requestUnifiedPasswordReset(formData: FormData) {
  const email = String(formData.get("email") ?? "").trim();

  if (email) {
    const supabase = createClient();
    const appUrl = (process.env.NEXT_PUBLIC_APP_URL ?? "").replace(/\/$/, "");
    const { error } = await supabase.auth.resetPasswordForEmail(email, {
      redirectTo: `${appUrl}/auth/callback?next=${encodeURIComponent("/team/reset-password")}`,
    });

    // A rate-limit or send failure must not be reported to the user as
    // "sent" — that used to be exactly this dead end: no email arrives,
    // no indication why, no way to tell it apart from a real send. Only
    // the classification is revealed, never whether the address is
    // actually registered.
    const classification = classifyResetError(error);
    if (classification) {
      redirect(`/login/forgot-password?error=${classification}`);
    }
  }

  redirect("/login/forgot-password?sent=1");
}

/** Shared sign-out — usable from any portal, not just /login. */
export async function unifiedSignOut() {
  const supabase = createClient();
  await supabase.auth.signOut();
  redirect("/login");
}
