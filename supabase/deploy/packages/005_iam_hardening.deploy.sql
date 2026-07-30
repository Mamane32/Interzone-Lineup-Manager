\set ON_ERROR_STOP on
\echo 'GGSP 005 | PREFLIGHT'

SELECT (
  (SELECT count(*) FROM information_schema.columns
   WHERE table_schema = 'public'
     AND ((table_name = 'user_access_assignments' AND column_name = 'invitation_id')
       OR (table_name = 'invitations' AND column_name = 'invited_user_id'))) = 2
  AND to_regclass('public.user_access_assignments_invitation_idx') IS NOT NULL
  AND to_regprocedure('public.reject_audit_log_mutation()') IS NOT NULL
  AND (SELECT count(*) FROM pg_trigger
       WHERE NOT tgisinternal AND tgrelid = to_regclass('public.audit_logs')
         AND tgname IN ('audit_logs_no_update','audit_logs_no_delete')) = 2
) AS already_applied
\gset
\if :already_applied
  SELECT 'PASS' AS status, '005_iam_hardening' AS migration, 'ALREADY_APPLIED' AS result;
  \quit 0
\endif

DO $preflight$
BEGIN
  IF to_regclass('public.user_access_assignments') IS NULL
     OR to_regclass('public.invitations') IS NULL
     OR to_regclass('public.audit_logs') IS NULL
     OR to_regtype('public.invitation_status') IS NULL THEN
    RAISE EXCEPTION 'GGSP 005 FAIL: migrations 003/004 prerequisites are missing';
  END IF;
  IF EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_schema = 'public'
      AND ((table_name = 'user_access_assignments' AND column_name = 'invitation_id')
        OR (table_name = 'invitations' AND column_name = 'invited_user_id'))
  ) OR to_regclass('public.user_access_assignments_invitation_idx') IS NOT NULL
    OR to_regprocedure('public.reject_audit_log_mutation()') IS NOT NULL THEN
    RAISE EXCEPTION 'GGSP 005 FAIL: migration objects already or partially exist';
  END IF;
END
$preflight$;

BEGIN;
SELECT pg_advisory_xact_lock(hashtext('ggsp-production-migrations'));
\ir ../../migrations/005_iam_hardening.sql

DO $verify$
DECLARE column_count integer; trigger_count integer;
BEGIN
  SELECT count(*) INTO column_count
  FROM information_schema.columns
  WHERE table_schema = 'public'
    AND ((table_name = 'user_access_assignments' AND column_name = 'invitation_id')
      OR (table_name = 'invitations' AND column_name = 'invited_user_id'));
  IF column_count <> 2
     OR to_regclass('public.user_access_assignments_invitation_idx') IS NULL
     OR to_regprocedure('public.reject_audit_log_mutation()') IS NULL THEN
    RAISE EXCEPTION 'GGSP 005 FAIL: hardening columns, index, or function are incomplete';
  END IF;
  SELECT count(*) INTO trigger_count FROM pg_trigger
  WHERE NOT tgisinternal AND tgrelid = 'public.audit_logs'::regclass
    AND tgname IN ('audit_logs_no_update','audit_logs_no_delete');
  IF trigger_count <> 2 THEN
    RAISE EXCEPTION 'GGSP 005 FAIL: expected 2 audit protection triggers, found %', trigger_count;
  END IF;
END
$verify$;

COMMIT;
SELECT 'PASS' AS status, '005_iam_hardening' AS migration;
