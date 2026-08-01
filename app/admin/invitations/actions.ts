"use server";

import { redirect } from "next/navigation";
import { revalidatePath } from "next/cache";
import { requireAdmin, getSessionUser } from "@/lib/access";
import { supabaseAdmin } from "@/lib/supabase-admin";
import { recordAuditEvent } from "@/lib/audit";
import { resolveAssignmentScope } from "@/lib/iam";
import { isPlatformRole } from "@/lib/validation";
import { assertCanManageRole } from "@/lib/privilege";
import type { Invitation } from "@/lib/types";

export async function inviteUser(formData: FormData) {
  const { role: actorRole } = await requireAdmin();
  const actor = await getSessionUser();

  const email = String(formData.get("email") ?? "").trim().toLowerCase();
  const full_name = String(formData.get("full_name") ?? "").trim() || null;
  const roleInput = String(formData.get("role_key") ?? "");
  const competitionInput = String(formData.get("competition_id") ?? "") || null;
  const teamInput = String(formData.get("team_id") ?? "") || null;
  const message = String(formData.get("message") ?? "").trim() || null;
  const expiresAtRaw = String(formData.get("expires_at") ?? "");
  const expires_at = expiresAtRaw ? new Date(expiresAtRaw).toISOString() : null;

  if (!email || !isPlatformRole(roleInput)) {
    redirectWithError("missing-fields");
  }
  const role_key = roleInput;

  const roleCheck = assertCanManageRole(actorRole, role_key);
  if (!roleCheck.ok) redirectWithError("forbidden");

  const scope = await resolveAssignmentScope(role_key, competitionInput, teamInput);
  if (!scope.ok) redirectWithError("invalid-scope");

  const admin = supabaseAdmin();

  // Record the invitation itself first, so it shows up as "pending" even
  // if the Supabase email send below fails for a configuration reason.
  const { data: invitation, error: insertError } = await admin
    .from("invitations")
    .insert({
      email,
      full_name,
      role_key,
      competition_id: scope.competitionId,
      team_id: scope.teamId,
      message,
      expires_at,
      invited_by: actor?.id ?? null,
    })
    .select("*")
    .single<Invitation>();

  if (insertError || !invitation) {
    console.error("invitation insert failed", insertError);
    redirectWithError("save-failed");
  }

  const appUrl = (process.env.NEXT_PUBLIC_APP_URL ?? "").replace(/\/$/, "");
  const { data: authResult, error: authError } = await admin.auth.admin.inviteUserByEmail(email, {
    redirectTo: `${appUrl}/auth/callback?next=${encodeURIComponent("/team/reset-password")}`,
  });

  if (authError || !authResult?.user) {
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

  // Newly-invited profile and assignment start as 'invited', not 'active' —
  // real access is only granted once the invite is accepted (password set),
  // via lib/invitations.ts's finalizeAcceptedInvitation, wired into
  // app/team/reset-password/actions.ts.
  const { error: profileError } = await admin
    .from("profiles")
    .upsert({ id: userId, email, full_name, status: "invited" }, { onConflict: "id" });

  const { error: assignmentError } = await admin.from("user_access_assignments").upsert(
    {
      user_id: userId,
      role_key,
      competition_id: scope.competitionId,
      team_id: scope.teamId,
      status: "invited",
      invitation_id: invitation!.id,
    },
    { onConflict: "user_id,role_key,team_id" }
  );

  await admin.from("invitations").update({ invited_user_id: userId }).eq("id", invitation!.id);

  if (profileError || assignmentError) {
    console.error("invitation profile/assignment setup failed", profileError, assignmentError);
    if (actor) {
      await recordAuditEvent({
        actorUserId: actor.id,
        action: "user.invited",
        targetType: "invitation",
        targetId: invitation!.id,
        metadata: { email, role_key, sent: true, setupError: true },
      });
    }
    revalidatePath("/admin/invitations");
    redirectWithError("setup-failed");
  }

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
  const { role: actorRole } = await requireAdmin();
  const actor = await getSessionUser();

  const admin = supabaseAdmin();
  const { data: invite } = await admin.from("invitations").select("*").eq("id", invitationId).maybeSingle<Invitation>();
  if (!invite) redirectWithInvitationsError("not-found");
  if (invite!.status !== "pending") redirectWithInvitationsError("not-pending");

  const roleCheck = assertCanManageRole(actorRole, invite!.role_key);
  if (!roleCheck.ok) redirectWithInvitationsError("forbidden");

  const appUrl = (process.env.NEXT_PUBLIC_APP_URL ?? "").replace(/\/$/, "");
  const { error } = await admin.auth.admin.inviteUserByEmail(invite!.email, {
    redirectTo: `${appUrl}/auth/callback?next=${encodeURIComponent("/team/reset-password")}`,
  });

  // Resend doubles as "regenerate": Supabase issues a fresh invite link
  // either way, but if the original had an expires_at, push it out from
  // now by the same span it was originally given — otherwise a resend on
  // an already-expired invitation would immediately display as "Expired"
  // again despite the new email having just gone out.
  if (!error && invite!.expires_at) {
    const originalSpanMs = new Date(invite!.expires_at).getTime() - new Date(invite!.created_at).getTime();
    const spanMs = originalSpanMs > 0 ? originalSpanMs : 7 * 24 * 60 * 60 * 1000;
    await admin
      .from("invitations")
      .update({ expires_at: new Date(Date.now() + spanMs).toISOString() })
      .eq("id", invitationId);
  }

  if (actor) {
    await recordAuditEvent({
      actorUserId: actor.id,
      action: "invitation.resent",
      targetType: "invitation",
      targetId: invitationId,
      metadata: { email: invite!.email, sent: !error, error: error?.message ?? null },
    });
  }

  if (error) {
    console.error("resend invitation failed", invitationId, error);
    revalidatePath("/admin/invitations");
    redirectWithInvitationsError("email-failed");
  }

  revalidatePath("/admin/invitations");
  redirect(`/admin/invitations?resent=1`);
}

export async function revokeInvitation(invitationId: string) {
  const { role: actorRole } = await requireAdmin();
  const actor = await getSessionUser();

  const admin = supabaseAdmin();
  const { data: invite } = await admin.from("invitations").select("*").eq("id", invitationId).maybeSingle<Invitation>();
  if (!invite) redirectWithInvitationsError("not-found");

  // Only a still-pending invitation can be revoked this way. An already
  // accepted invitation belongs to a real, active user now — use the
  // Users page (suspend/disable) for that, which never touches
  // "unrelated" assignments this account may have picked up since.
  if (invite!.status !== "pending") redirectWithInvitationsError("not-pending");

  const roleCheck = assertCanManageRole(actorRole, invite!.role_key);
  if (!roleCheck.ok) redirectWithInvitationsError("forbidden");

  const { error: revokeError } = await admin
    .from("invitations")
    .update({ status: "revoked" })
    .eq("id", invitationId)
    .eq("status", "pending");

  if (revokeError) {
    console.error("revoke invitation failed", invitationId, revokeError);
    redirectWithInvitationsError("save-failed");
  }

  // Cascade: disable exactly the assignments this invitation created —
  // never anything the user might separately hold.
  await admin
    .from("user_access_assignments")
    .update({ status: "disabled" })
    .eq("invitation_id", invitationId)
    .eq("status", "invited");

  // The invited profile must not retain platform access. Only touches a
  // profile still in 'invited' status — if it's somehow already active
  // (e.g. a race with acceptance), this deliberately leaves it alone rather
  // than disabling a real accepted user out from under them.
  if (invite!.invited_user_id) {
    await admin
      .from("profiles")
      .update({ status: "disabled" })
      .eq("id", invite!.invited_user_id)
      .eq("status", "invited");

    // Invalidate the unaccepted Supabase Auth account outright so the
    // email becomes available for a fresh invitation and no dangling
    // unconfirmed account persists. Best-effort: a failure here doesn't
    // block the rest of the revoke (the assignment/profile changes above
    // already remove platform access regardless).
    try {
      await admin.auth.admin.deleteUser(invite!.invited_user_id);
    } catch (err) {
      console.error("failed to delete unaccepted invited auth user", invite!.invited_user_id, err);
    }
  }

  if (actor) {
    await recordAuditEvent({
      actorUserId: actor.id,
      action: "invitation.revoked",
      targetType: "invitation",
      targetId: invitationId,
      metadata: { email: invite!.email },
    });
  }

  revalidatePath("/admin/invitations");
  revalidatePath("/admin/users");
  revalidatePath("/admin/access");
  redirect(`/admin/invitations?revoked=1`);
}

// --- helpers ---------------------------------------------------------------

function redirectWithError(reason: string): never {
  redirect(`/admin/invitations?error=${reason}`);
}
function redirectWithSuccess(): never {
  redirect(`/admin/invitations?sent=1`);
}
function redirectWithInvitationsError(reason: string): never {
  redirect(`/admin/invitations?error=${reason}`);
}
