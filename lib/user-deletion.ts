import "server-only";
import { supabaseAdmin } from "@/lib/supabase-admin";

export type DeleteUserIdentityResult = { ok: true } | { ok: false; error: string };

/**
 * The single, shared "this identity never existed" core — used by both
 * deleteInvitation (app/admin/invitations/actions.ts, never-accepted
 * invitations) and deleteUser (app/admin/users/[userId]/actions.ts,
 * accepted users). Sprint 3 Phase 2 platform policy, explicitly reversing
 * the earlier "never expose Delete for accepted users" rule: Delete is now
 * permanent and complete, Revoke stays exactly as it was (temporary,
 * reversible, keeps every record).
 *
 * Deliberately does NOT touch teams/competitions/players/matches/lineups/
 * results — confirmed by reading supabase/schema.sql directly that none of
 * those tables reference a user's profile or Auth id at all (a coach's
 * identity is only ever linked via user_access_assignments/invitations),
 * so this can never reach competition data.
 *
 * Deletion order matters: invitation rows are removed *before* the Auth
 * user, because `invitations.invited_user_id`/`accepted_user_id` are
 * `ON DELETE SET NULL` (the row survives, just un-owned) rather than
 * cascaded — deleting them here first is the only way "remove the
 * invitation" actually happens. `profiles` and `user_access_assignments`
 * both carry `ON DELETE CASCADE` to `auth.users` (confirmed directly
 * against schema.sql), so deleting the Auth user removes both
 * automatically — no separate calls needed or safer than letting
 * Postgres's own referential integrity handle it atomically.
 */
export async function deleteUserIdentity(userId: string): Promise<DeleteUserIdentityResult> {
  const admin = supabaseAdmin();

  // Confirmed the real cause of "deleting a user still leaves orphaned
  // records visible": teams.coach_name/coach_email/coach_phone are
  // independent, denormalized text columns — not foreign keys to
  // profiles/auth.users (confirmed against supabase/schema.sql). Deleting
  // the identity never touched them, so a deleted coach's name/email/phone
  // kept showing on that team's admin page and coach-portal header as if
  // they still held the role. Cleared here — team, competition, match,
  // player, and lineup data are never touched, only these three text
  // fields on the specific team(s) this identity was the coach of.
  const { data: profile } = await admin.from("profiles").select("email").eq("id", userId).maybeSingle();
  const { data: coachAssignments } = await admin
    .from("user_access_assignments")
    .select("team_id")
    .eq("user_id", userId)
    .eq("role_key", "coach")
    .not("team_id", "is", null);

  const teamIds = new Set((coachAssignments ?? []).map((a) => a.team_id as string));

  if (profile?.email) {
    // Legacy fallback case (lib/coach-auth.ts): a team can still be coached
    // via teams.coach_email alone, with no user_access_assignments row at
    // all — caught here so that path doesn't leave a stale contact either.
    const { data: legacyTeams } = await admin.from("teams").select("id").ilike("coach_email", profile.email);
    for (const t of legacyTeams ?? []) teamIds.add(t.id as string);
  }

  if (teamIds.size > 0) {
    const { error: teamsError } = await admin
      .from("teams")
      .update({ coach_name: "", coach_phone: "", coach_email: null })
      .in("id", Array.from(teamIds));
    if (teamsError) {
      console.error("deleteUserIdentity: clearing stale coach contact fields failed", userId, teamsError);
      return { ok: false, error: "Could not clear this coach's contact details from their team. Please try again." };
    }
  }

  const { error: invitationsError } = await admin
    .from("invitations")
    .delete()
    .or(`invited_user_id.eq.${userId},accepted_user_id.eq.${userId}`);

  if (invitationsError) {
    console.error("deleteUserIdentity: invitation cleanup failed", userId, invitationsError);
    return { ok: false, error: "Could not remove this identity's invitation records. Please try again." };
  }

  const { error: authError } = await admin.auth.admin.deleteUser(userId);
  if (authError) {
    console.error("deleteUserIdentity: auth deleteUser failed", userId, authError);
    return { ok: false, error: "Could not remove the Auth account. Please try again." };
  }

  return { ok: true };
}
