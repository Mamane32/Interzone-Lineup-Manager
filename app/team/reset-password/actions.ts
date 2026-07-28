"use server";

import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { resolveUserDestination } from "@/lib/access";
import { finalizeAcceptedInvitation } from "@/lib/invitations";

/**
 * Shared reset-password action for every portal — coach invites/resets
 * (token present, redirect straight back to that team's dashboard) and the
 * unified login's forgot-password flow (no token — route through the same
 * centralized resolver every other login path uses).
 */
export async function setNewPassword(token: string | undefined, formData: FormData) {
  const password = String(formData.get("password") ?? "");
  const confirm = String(formData.get("confirm") ?? "");

  if (password.length < 8) {
    redirect(`/team/reset-password?token=${token ?? ""}&error=short`);
  }
  if (password !== confirm) {
    redirect(`/team/reset-password?token=${token ?? ""}&error=mismatch`);
  }

  const supabase = createClient();
  const { error, data } = await supabase.auth.updateUser({ password });

  if (error || !data.user) {
    redirect(`/team/reset-password?token=${token ?? ""}&error=1`);
  }

  // Flips invitation/profile/assignments from 'invited' to 'active' if this
  // password-set was completing a Sprint 1.3 invitation. Safe no-op
  // otherwise (e.g. a coach's legacy invite, or an ordinary password reset
  // for an already-active user) — see lib/invitations.ts.
  await finalizeAcceptedInvitation(data.user.id, data.user.email ?? "");

  if (token) {
    redirect(`/team/${token}/dashboard`);
  }

  const resolution = await resolveUserDestination(data.user.id);
  if (resolution.kind === "redirect") redirect(resolution.path);
  if (resolution.kind === "select-workspace") redirect("/select-workspace");
  redirect(`/login?error=${resolution.reason}`);
}
