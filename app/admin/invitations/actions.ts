"use server";

import { redirect } from "next/navigation";
import { revalidatePath } from "next/cache";
import { requireAdmin, getSessionUser } from "@/lib/access";
import { supabaseAdmin } from "@/lib/supabase-admin";
import { recordAuditEvent } from "@/lib/audit";
import type { PlatformRole } from "@/lib/types";

export async function inviteUser(formData: FormData) {
  await requireAdmin();
  const actor = await getSessionUser();

  const email = String(formData.get("email") ?? "").trim().toLowerCase();
  const full_name = String(formData.get("full_name") ?? "").trim() || null;
  const role_key = String(formData.get("role_key") ?? "") as PlatformRole;
  const competition_id = String(formData.get("competition_id") ?? "") || null;
  const team_id = String(formData.get("team_id") ?? "") || null;
  const message = String(formData.get("message") ?? "").trim() || null;
  const expiresAtRaw = String(formData.get("expires_at") ?? "");
  const expires_at = expiresAtRaw ? new Date(expiresAtRaw).toISOString() : null;

  if (!email || !role_key) {
    redirectWithError("missing-fields");
  }

  const admin = supabaseAdmin();

  // Record the invitation itself first, so it shows up as "pending" even
  // if the Supabase email send below fails for a configuration reason.
  const { data: invitation, error: insertError } = await admin
    .from("invitations")
    .insert({ email, full_name, role_key, competition_id, team_id, message, expires_at, invited_by: actor?.id ?? null })
    .select("id")
    .single();

  if (insertError || !invitation) {
    revalidatePath("/admin/invitations");
    redirectWithError("save-failed");
  }

  const appUrl = (process.env.NEXT_PUBLIC_APP_URL ?? "").replace(/\/$/, "");
  const { data: authResult, error: authError } = await admin.auth.admin.inviteUserByEmail(email, {
    redirectTo: `${appUrl}/auth/callback?next=${encodeURIComponent("/team/reset-password")}`,
  });

  if (authError || !authResult.user) {
    if (actor) {
      await recordAuditEvent({
        actorUserId: actor.id,
        action: "user.invited",
        targetType: "invitation",
        targetId: invitation!.id,
        metadata: { email, role_key, sent: false, error: authError?.message ?? "unknown" },
      });
    }
    revalidatePath("/admin/invitations");
    redirectWithError("email-failed");
  }

  const userId = authResult!.user!.id;

  await admin.from("profiles").upsert({ id: userId, email, full_name, status: "active" }, { onConflict: "id" });
  await admin.from("user_access_assignments").upsert(
    { user_id: userId, role_key, competition_id, team_id, status: "active" },
    { onConflict: "user_id,role_key,team_id" }
  );

  if (actor) {
    await recordAuditEvent({
      actorUserId: actor.id,
      action: "user.invited",
      targetType: "invitation",
      targetId: invitation!.id,
      metadata: { email, role_key, sent: true },
    });
  }

  revalidatePath("/admin/invitations");
  revalidatePath("/admin/users");
  redirectWithSuccess();
}

export async function resendInvitation(invitationId: string) {
  await requireAdmin();
  const actor = await getSessionUser();

  const admin = supabaseAdmin();
  const { data: invite } = await admin.from("invitations").select("*").eq("id", invitationId).single();
  if (!invite) return;

  const appUrl = (process.env.NEXT_PUBLIC_APP_URL ?? "").replace(/\/$/, "");
  await admin.auth.admin.inviteUserByEmail(invite.email, {
    redirectTo: `${appUrl}/auth/callback?next=${encodeURIComponent("/team/reset-password")}`,
  });

  await admin.from("invitations").update({ status: "pending" }).eq("id", invitationId);

  if (actor) {
    await recordAuditEvent({
      actorUserId: actor.id,
      action: "invitation.resent",
      targetType: "invitation",
      targetId: invitationId,
      metadata: { email: invite.email },
    });
  }

  revalidatePath("/admin/invitations");
}

export async function revokeInvitation(invitationId: string) {
  await requireAdmin();
  const actor = await getSessionUser();

  const admin = supabaseAdmin();
  await admin.from("invitations").update({ status: "revoked" }).eq("id", invitationId);

  if (actor) {
    await recordAuditEvent({
      actorUserId: actor.id,
      action: "invitation.revoked",
      targetType: "invitation",
      targetId: invitationId,
    });
  }

  revalidatePath("/admin/invitations");
}

// --- helpers ---------------------------------------------------------------

function redirectWithError(reason: string): never {
  redirect(`/admin/invitations?error=${reason}`);
}
function redirectWithSuccess(): never {
  redirect(`/admin/invitations?sent=1`);
}
