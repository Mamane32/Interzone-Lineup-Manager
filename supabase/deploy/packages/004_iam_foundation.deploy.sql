\set ON_ERROR_STOP on
\echo 'GGSP 004 | PREFLIGHT'

SELECT (
  to_regtype('public.invitation_status') IS NOT NULL
  AND to_regclass('public.invitations') IS NOT NULL
  AND to_regclass('public.audit_logs') IS NOT NULL
  AND to_regclass('public.role_metadata') IS NOT NULL
  AND (SELECT count(*) FROM pg_indexes WHERE schemaname = 'public' AND indexname IN (
    'invitations_email_idx','invitations_status_idx','audit_logs_actor_idx',
    'audit_logs_action_idx','audit_logs_target_idx','audit_logs_created_idx'
  )) = 6
  AND (SELECT count(*) FROM pg_trigger
       WHERE NOT tgisinternal
         AND tgname IN ('invitations_set_updated_at','role_metadata_set_updated_at')) = 2
) AS already_applied
\gset
\if :already_applied
  SELECT 'PASS' AS status, '004_iam_foundation' AS migration, 'ALREADY_APPLIED' AS result;
  \quit 0
\endif

DO $preflight$
BEGIN
  IF to_regtype('public.platform_role') IS NULL
     OR to_regtype('public.access_status') IS NULL
     OR to_regclass('public.profiles') IS NULL
     OR to_regclass('public.user_access_assignments') IS NULL
     OR to_regprocedure('public.set_updated_at_profiles()') IS NULL THEN
    RAISE EXCEPTION 'GGSP 004 FAIL: migration 003 prerequisites are missing';
  END IF;
  IF to_regtype('public.invitation_status') IS NOT NULL
     OR to_regclass('public.invitations') IS NOT NULL
     OR to_regclass('public.audit_logs') IS NOT NULL
     OR to_regclass('public.role_metadata') IS NOT NULL THEN
    RAISE EXCEPTION 'GGSP 004 FAIL: migration objects already or partially exist';
  END IF;
END
$preflight$;

BEGIN;
SELECT pg_advisory_xact_lock(hashtext('ggsp-production-migrations'));
\ir ../../migrations/004_iam_foundation.sql

DO $verify$
DECLARE role_count integer; index_count integer; trigger_count integer;
BEGIN
  IF to_regtype('public.invitation_status') IS NULL
     OR to_regclass('public.invitations') IS NULL
     OR to_regclass('public.audit_logs') IS NULL
     OR to_regclass('public.role_metadata') IS NULL THEN
    RAISE EXCEPTION 'GGSP 004 FAIL: required IAM foundation objects were not created';
  END IF;
  SELECT count(*) INTO role_count FROM public.role_metadata;
  IF role_count <> 8 THEN
    RAISE EXCEPTION 'GGSP 004 FAIL: expected 8 system roles, found %', role_count;
  END IF;
  SELECT count(*) INTO index_count FROM pg_indexes
  WHERE schemaname = 'public' AND indexname IN (
    'invitations_email_idx','invitations_status_idx','audit_logs_actor_idx',
    'audit_logs_action_idx','audit_logs_target_idx','audit_logs_created_idx'
  );
  IF index_count <> 6 THEN
    RAISE EXCEPTION 'GGSP 004 FAIL: expected 6 IAM indexes, found %', index_count;
  END IF;
  SELECT count(*) INTO trigger_count FROM pg_trigger
  WHERE NOT tgisinternal AND tgname IN ('invitations_set_updated_at','role_metadata_set_updated_at');
  IF trigger_count <> 2 THEN
    RAISE EXCEPTION 'GGSP 004 FAIL: expected 2 update triggers, found %', trigger_count;
  END IF;
  IF EXISTS (
    SELECT 1 FROM pg_class
    WHERE oid IN ('public.invitations'::regclass,'public.audit_logs'::regclass,'public.role_metadata'::regclass)
      AND NOT relrowsecurity
  ) THEN
    RAISE EXCEPTION 'GGSP 004 FAIL: RLS is not enabled on all IAM foundation tables';
  END IF;
END
$verify$;

COMMIT;
SELECT 'PASS' AS status, '004_iam_foundation' AS migration;
