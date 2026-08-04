-- ============================================================================
-- SPRINT 3 PHASE 2 — Invitation Management Redesign (Item A)
-- ============================================================================
-- Additive only. Run AFTER 018_invitation_status_archived.sql.
--
-- Requirement: never call admin.auth.admin.inviteUserByEmail() for an email
-- that already has a registered auth.users row — this is the exact call
-- that was confirmed broken for Resend (Sprint 3 Phase 1 Validation Report,
-- Finding 3): Supabase Auth rejects a second inviteUserByEmail() for an
-- email with an existing account, even an unconfirmed one.
--
-- The installed @supabase/auth-js admin API (confirmed by direct inspection
-- of node_modules/@supabase/auth-js/dist/module/GoTrueAdminApi.js) has no
-- getUserByEmail method, and listUsers() has no server-side email filter in
-- this version — scanning all pages client-side does not scale. A small,
-- read-only security definer function is the same pattern already reviewed
-- for Force Password Reset's session-revocation redesign
-- (FORCE_PASSWORD_RESET_DESIGN_REVIEW.md, Option C) — narrowly scoped to a
-- single indexed lookup, nothing else.

create or replace function find_auth_user_by_email(p_email text)
returns uuid
language sql
security definer
set search_path = auth, public
stable
as $$
  select id from auth.users where lower(email) = lower(p_email) limit 1;
$$;

-- Callable only via the service-role client (every table/function in this
-- schema is otherwise locked down — see supabase/schema.sql's RLS posture);
-- revoke from anon/authenticated explicitly so this can't be probed as an
-- email-enumeration oracle from the client side.
revoke all on function find_auth_user_by_email(text) from public, anon, authenticated;
