import "server-only";
import { supabaseAdmin } from "@/lib/supabase-admin";
import type { Invitation, PlatformRole } from "@/lib/types";

/**
 * Shared core of the invitation lifecycle — the DB rows + Supabase Auth
 * self-set-password invite, with zero business validation (that stays in
 * each caller: requireAdmin/requireRole, assertCanManageRole,
 * resolveAssignmentScope, redirects, audit logging). Every role goes
 * through this — admin invites, and coach invites since Sprint 3 Phase 1
 * (see app/admin/teams/[id]/actions.ts's inviteCoach) — so every role
 * shares one lifecycle, one audit trail, one resend/revoke/expiry story.
 */

export type CreateInvitationParams = {
  email: string;
  full_name: string | null;
  role_key: PlatformRole;
  competition_id: string | null;
  team_id: string | null;
  message: string | null;
  expires_at: string | null;
  invited_by: string | null;
  /** Path (not full URL) the accepted-invite email link lands on, e.g.
   * "/team/reset-password" or "/team/reset-password?token=...". */
  redirectPath: string;
};

export type CreateInvitationResult =
  | { ok: true; invitation: Invitation }
  | { ok: false; reason: "save-failed" }
  | { ok: false; reason: "email-failed"; invitation: Invitation; authErrorMessage: string }
  | { ok: false; reason: "setup-failed"; invitation: Invitation };

/**
 * Looks up whether `email` already has a Supabase Auth account, via the
 * `find_auth_user_by_email` security-definer function (migration 019) —
 * the installed @supabase/auth-js has no getUserByEmail and listUsers() has
 * no server-side email filter in this version, so a narrow, read-only DB
 * function is the only efficient option. Fails open (returns null) on an
 * RPC error rather than blocking the invite entirely — the caller falls
 * back to inviteUserByEmail, which fails safely (a clear, non-destructive
 * error) if an account genuinely already exists.
 */
async function findExistingAuthUserId(admin: ReturnType<typeof supabaseAdmin>, email: string): Promise<string | null> {
  const { data, error } = await admin.rpc("find_auth_user_by_email", { p_email: email });
  if (error) {
    console.error("find_auth_user_by_email failed", error);
    return null;
  }
  return (data as string | null) ?? null;
}

export async function createInvitation(params: CreateInvitationParams): Promise<CreateInvitationResult> {
  const admin = supabaseAdmin();

  // Record the invitation itself first, so it shows up as "pending" even
  // if the Supabase email send below fails for a configuration reason.
  const { data: invitation, error: insertError } = await admin
    .from("invitations")
    .insert({
      email: params.email,
      full_name: params.full_name,
      role_key: params.role_key,
      competition_id: params.competition_id,
      team_id: params.team_id,
      message: params.message,
      expires_at: params.expires_at,
      invited_by: params.invited_by,
    })
    .select("*")
    .single<Invitation>();

  if (insertError || !invitation) {
    console.error("invitation insert failed", insertError);
    return { ok: false, reason: "save-failed" };
  }

  const appUrl = (process.env.NEXT_PUBLIC_APP_URL ?? "").replace(/\/$/, "");
  const redirectTo = `${appUrl}/auth/callback?next=${encodeURIComponent(params.redirectPath)}`;

  // Never call inviteUserByEmail() for an email that already has a
  // registered Auth account — this is the exact call confirmed broken for
  // that case (Sprint 3 Phase 1 Validation Report, Finding 3). An existing
  // account gets a real login/reset link instead (the same
  // resetPasswordForEmail call app/admin/users/[userId]/actions.ts's
  // forcePasswordReset already uses and this project has confirmed live
  // sends a real email) — a brand-new email still goes through
  // inviteUserByEmail, unchanged.
  const existingUserId = await findExistingAuthUserId(admin, params.email);

  let userId: string;
  if (existingUserId) {
    const { error: authError } = await admin.auth.resetPasswordForEmail(params.email, { redirectTo });
    if (authError) {
      // Logged deliberately, not just audit-recorded by the caller — the
      // raw GoTrue code/status is what actually answers "did the request
      // reach GoTrue, and what did it say," not just "sent: false."
      console.error("createInvitation: resetPasswordForEmail failed (existing user)", {
        email: params.email,
        code: (authError as { code?: string }).code,
        status: authError.status,
        message: authError.message,
      });
      return { ok: false, reason: "email-failed", invitation, authErrorMessage: authError.message };
    }
    userId = existingUserId;
  } else {
    const { data: authResult, error: authError } = await admin.auth.admin.inviteUserByEmail(params.email, { redirectTo });
    if (authError || !authResult?.user) {
      console.error("createInvitation: inviteUserByEmail failed (new user)", {
        email: params.email,
        code: (authError as { code?: string } | null)?.code,
        status: authError?.status,
        message: authError?.message,
      });
      return { ok: false, reason: "email-failed", invitation, authErrorMessage: authError?.message ?? "unknown" };
    }
    userId = authResult.user.id;
  }

  // Newly-invited profile and assignment start as 'invited', not 'active' —
  // real access is only granted once the invite is accepted (password set),
  // via lib/invitations.ts's finalizeAcceptedInvitation. An existing
  // account that's already 'active' (e.g. being invited into a second,
  // additional role) must not be knocked back to 'invited' — only a
  // genuinely new or not-yet-active profile gets that status.
  const { data: existingProfile } = await admin.from("profiles").select("status").eq("id", userId).maybeSingle();
  const profileStatus = existingProfile?.status === "active" ? "active" : "invited";

  const { error: profileError } = await admin
    .from("profiles")
    .upsert({ id: userId, email: params.email, full_name: params.full_name, status: profileStatus }, { onConflict: "id" });

  const { error: assignmentError } = await admin.from("user_access_assignments").upsert(
    {
      user_id: userId,
      role_key: params.role_key,
      competition_id: params.competition_id,
      team_id: params.team_id,
      status: "invited",
      invitation_id: invitation.id,
    },
    { onConflict: "user_id,role_key,team_id" }
  );

  await admin.from("invitations").update({ invited_user_id: userId }).eq("id", invitation.id);

  if (profileError || assignmentError) {
    console.error("invitation profile/assignment setup failed", profileError, assignmentError);
    return { ok: false, reason: "setup-failed", invitation };
  }

  return { ok: true, invitation };
}

export type ResendInvitationResult = { ok: true } | { ok: false; errorMessage: string };

/**
 * Re-sends an access link for an existing invitation row and revives it to
 * 'pending' — works identically whether the row was still 'pending', had
 * lapsed to 'expired', or is being revived from 'revoked' by
 * restoreInvitation. Resolves the correct redirect path itself (team-token
 * path for a coach invitation, the generic path otherwise) so callers don't
 * need to reconstruct it.
 *
 * Fixes the pre-existing Resend defect (Sprint 3 Phase 1 Validation Report,
 * Finding 3): a resend almost always targets an email that already has a
 * registered Auth account (`invite.invited_user_id` is set the moment the
 * original invite succeeded) — calling inviteUserByEmail() a second time
 * for that email always failed. Resend now sends a real login/reset link
 * (resetPasswordForEmail) whenever an Auth account already exists for this
 * invitation, and only falls back to inviteUserByEmail for the edge case
 * where the original invite's Auth account creation itself never completed.
 */
export async function resendInvitationCore(invite: Invitation): Promise<ResendInvitationResult> {
  const admin = supabaseAdmin();
  const appUrl = (process.env.NEXT_PUBLIC_APP_URL ?? "").replace(/\/$/, "");

  let redirectPath = "/team/reset-password";
  if (invite.role_key === "coach" && invite.team_id) {
    const { data: team } = await admin.from("teams").select("token").eq("id", invite.team_id).maybeSingle();
    if (team?.token) redirectPath = `/team/reset-password?token=${team.token}`;
  }

  const redirectTo = `${appUrl}/auth/callback?next=${encodeURIComponent(redirectPath)}`;
  const existingUserId = invite.invited_user_id ?? (await findExistingAuthUserId(admin, invite.email));

  const { error } = existingUserId
    ? await admin.auth.resetPasswordForEmail(invite.email, { redirectTo })
    : await admin.auth.admin.inviteUserByEmail(invite.email, { redirectTo });

  if (error) {
    console.error("resendInvitationCore: auth call failed", {
      email: invite.email,
      existingUser: Boolean(existingUserId),
      code: (error as { code?: string }).code,
      status: error.status,
      message: error.message,
    });
    return { ok: false, errorMessage: error.message };
  }

  // Always revive status back to 'pending' — a resend of an 'expired'
  // invitation must make it acceptable again, not leave it stuck. If the
  // original had an expires_at, push it out from now by the same span it
  // was originally given, so it doesn't immediately re-expire.
  const update: { status: "pending"; expires_at?: string } = { status: "pending" };
  if (invite.expires_at) {
    const originalSpanMs = new Date(invite.expires_at).getTime() - new Date(invite.created_at).getTime();
    const spanMs = originalSpanMs > 0 ? originalSpanMs : 7 * 24 * 60 * 60 * 1000;
    update.expires_at = new Date(Date.now() + spanMs).toISOString();
  }
  await admin.from("invitations").update(update).eq("id", invite.id);

  return { ok: true };
}
