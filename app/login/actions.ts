"use server";

import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { resolveUserDestination } from "@/lib/access";

export async function unifiedLogin(formData: FormData) {
  const email = String(formData.get("email") ?? "").trim();
  const password = String(formData.get("password") ?? "");

  const supabase = createClient();

  // signInWithPassword only wraps recognized AuthError failures into
  // {error} — anything else it throws (e.g. a raw exception while saving
  // the session), which without this boundary crashes the whole request
  // instead of leaving the operator on a working /login page. Caught here
  // specifically so a real failure is diagnosable in server logs instead
  // of surfacing only as the generic root error boundary.
  let signInResult;
  try {
    signInResult = await supabase.auth.signInWithPassword({ email, password });
  } catch (err) {
    console.error("unifiedLogin: signInWithPassword threw", err instanceof Error ? err.stack : err);
    redirect("/login?error=signin-exception");
  }
  const { data, error } = signInResult;

  if (error || !data.user) {
    redirect("/login?error=invalid");
  }

  // Same reasoning: resolveUserDestination does real database reads
  // (service-role client) that can throw on misconfiguration — isolate
  // that from the sign-in step above so the error code alone tells us
  // which phase failed, no log access required to narrow it down.
  let resolution;
  try {
    resolution = await resolveUserDestination(data.user.id);
  } catch (err) {
    console.error("unifiedLogin: resolveUserDestination threw", err instanceof Error ? err.stack : err);
    redirect("/login?error=resolve-exception");
  }

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
    await supabase.auth.resetPasswordForEmail(email, {
      redirectTo: `${appUrl}/auth/callback?next=${encodeURIComponent("/team/reset-password")}`,
    });
  }

  // Always the same response — never reveal whether an email is registered.
  redirect("/login/forgot-password?sent=1");
}

/** Shared sign-out — usable from any portal, not just /login. */
export async function unifiedSignOut() {
  const supabase = createClient();
  await supabase.auth.signOut();
  redirect("/login");
}
