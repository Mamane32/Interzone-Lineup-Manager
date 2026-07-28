-- ============================================================================
-- SPRINT 1.3 HARDENING — Corrections to the IAM Foundation
-- ============================================================================
-- Additive only. Run AFTER 004_iam_foundation.sql. Nothing existing is
-- dropped, renamed, or retyped. Safe to run more than once where practical
-- (guarded with IF NOT EXISTS / OR REPLACE / conditional DO blocks).

-- ---------------------------------------------------------------------------
-- 1. Invitation -> assignment traceability (item 2 of the hardening brief)
-- ---------------------------------------------------------------------------
-- Lets a revoke cascade to exactly the assignments a given invitation
-- created, and lets acceptance flip exactly those assignments (and no
-- others) from 'invited' to 'active'. Existing assignment rows simply get
-- NULL here — they were never tied to an invitation and are unaffected.
alter table user_access_assignments
  add column if not exists invitation_id uuid references invitations(id) on delete set null;

create index if not exists user_access_assignments_invitation_idx
  on user_access_assignments (invitation_id);

-- ---------------------------------------------------------------------------
-- 2. Distinguish "the auth user Supabase created at invite time" from
--    "the auth user id recorded once they actually accepted" (item 4 —
--    revoke needs to know which unaccepted auth user to invalidate without
--    confusing that with genuine acceptance).
-- ---------------------------------------------------------------------------
alter table invitations
  add column if not exists invited_user_id uuid references auth.users(id) on delete set null;

-- ---------------------------------------------------------------------------
-- 3. Audit log — real, DB-enforced append-only (item 9). RLS + "no policies"
--    only stops normal (anon/authenticated-role) clients; the service-role
--    client used throughout this codebase bypasses RLS by design, so RLS
--    alone was never a real guarantee against this app's own code issuing
--    an UPDATE/DELETE by mistake. A trigger fires for every role, including
--    service_role, because it isn't a security policy — it's a data
--    integrity rule enforced by the database engine itself.
-- ---------------------------------------------------------------------------
create or replace function reject_audit_log_mutation()
returns trigger as $$
begin
  raise exception 'audit_logs is append-only: % is not permitted', TG_OP;
end;
$$ language plpgsql;

drop trigger if exists audit_logs_no_update on audit_logs;
create trigger audit_logs_no_update
  before update on audit_logs
  for each row execute procedure reject_audit_log_mutation();

drop trigger if exists audit_logs_no_delete on audit_logs;
create trigger audit_logs_no_delete
  before delete on audit_logs
  for each row execute procedure reject_audit_log_mutation();

-- ---------------------------------------------------------------------------
-- 4. Backfill: existing 'active' assignments/profiles created directly by
--    an admin (not through an invitation) are untouched by this migration —
--    only application code changes how NEW invitation-originated records
--    are created going forward (see lib/invitations.ts). No existing row's
--    status is changed by this migration.
-- ---------------------------------------------------------------------------
-- (Intentionally no UPDATE statements here — see note above. This section
-- exists to document that omission was deliberate, not an oversight.)
