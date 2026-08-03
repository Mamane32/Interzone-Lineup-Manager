import "server-only";
import { supabaseAdmin } from "@/lib/supabase-admin";

/**
 * Session-invalidation abstraction for admin-triggered actions (currently
 * just Force Password Reset — see app/admin/users/[userId]/actions.ts).
 * Every caller goes through lockOutUser/restoreUserAccess so the actual
 * mechanism can be swapped later (e.g. if/when a native
 * "revoke all sessions for user X" admin API becomes available in this
 * project's Supabase SDK version) without touching call sites.
 *
 * Mechanism: Supabase's admin `updateUserById(uid, { ban_duration })` —
 * confirmed present in the installed @supabase/auth-js admin API. This
 * app's middleware (lib/supabase/middleware.ts) calls
 * `supabase.auth.getUser()` on every request matching its route matcher
 * (every protected path), which hits Supabase's live /auth/v1/user
 * endpoint rather than trusting a locally-cached JWT — so a banned user's
 * very next request, on any device or tab, is rejected there. That's what
 * actually delivers "require re-authentication everywhere" here, not
 * enumerating individual sessions.
 */

const LOCKOUT_BAN_DURATION = "876000h"; // ~100 years — effectively indefinite until restoreUserAccess unbans

export async function lockOutUser(userId: string): Promise<{ ok: boolean }> {
  const admin = supabaseAdmin();
  const { error } = await admin.auth.admin.updateUserById(userId, { ban_duration: LOCKOUT_BAN_DURATION });
  if (error) {
    console.error("lockOutUser failed", userId, error);
    return { ok: false };
  }
  return { ok: true };
}

export async function restoreUserAccess(userId: string): Promise<{ ok: boolean }> {
  const admin = supabaseAdmin();
  const { error } = await admin.auth.admin.updateUserById(userId, { ban_duration: "0s" });
  if (error) {
    console.error("restoreUserAccess failed", userId, error);
    return { ok: false };
  }
  return { ok: true };
}
