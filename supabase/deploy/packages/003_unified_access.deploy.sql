\set ON_ERROR_STOP on
\echo 'GGSP 003 | PREFLIGHT'

SELECT (
  to_regtype('public.access_status') IS NOT NULL
  AND to_regtype('public.platform_role') IS NOT NULL
  AND to_regclass('public.profiles') IS NOT NULL
  AND to_regclass('public.user_access_assignments') IS NOT NULL
  AND to_regprocedure('public.set_updated_at_profiles()') IS NOT NULL
  AND to_regclass('public.user_access_assignments_user_idx') IS NOT NULL
  AND to_regclass('public.user_access_assignments_team_idx') IS NOT NULL
  AND EXISTS (
    SELECT 1 FROM pg_constraint
    WHERE conrelid = to_regclass('public.user_access_assignments')
      AND conname = 'user_access_assignments_unique_grant' AND contype = 'u'
  )
) AS already_applied
\gset
\if :already_applied
  SELECT 'PASS' AS status, '003_unified_access' AS migration, 'ALREADY_APPLIED' AS result;
  \quit 0
\endif

DO $preflight$
BEGIN
  IF to_regclass('auth.users') IS NULL
     OR to_regclass('public.competitions') IS NULL
     OR to_regclass('public.teams') IS NULL
     OR to_regclass('public.match_events') IS NULL THEN
    RAISE EXCEPTION 'GGSP 003 FAIL: auth, MVP, or migration 002 prerequisites are missing';
  END IF;
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_schema = 'public' AND table_name = 'teams' AND column_name = 'coach_email'
  ) THEN
    RAISE EXCEPTION 'GGSP 003 FAIL: teams.coach_email is required';
  END IF;
  IF to_regtype('public.access_status') IS NOT NULL
     OR to_regtype('public.platform_role') IS NOT NULL
     OR to_regclass('public.profiles') IS NOT NULL
     OR to_regclass('public.user_access_assignments') IS NOT NULL THEN
    RAISE EXCEPTION 'GGSP 003 FAIL: migration objects already or partially exist';
  END IF;
END
$preflight$;

BEGIN;
SELECT pg_advisory_xact_lock(hashtext('ggsp-production-migrations'));
\ir ../../migrations/003_unified_access.sql

DO $verify$
DECLARE trigger_count integer;
BEGIN
  IF to_regtype('public.access_status') IS NULL
     OR to_regtype('public.platform_role') IS NULL
     OR to_regclass('public.profiles') IS NULL
     OR to_regclass('public.user_access_assignments') IS NULL
     OR to_regprocedure('public.set_updated_at_profiles()') IS NULL
     OR to_regclass('public.user_access_assignments_user_idx') IS NULL
     OR to_regclass('public.user_access_assignments_team_idx') IS NULL THEN
    RAISE EXCEPTION 'GGSP 003 FAIL: required IAM objects were not created';
  END IF;
  SELECT count(*) INTO trigger_count
  FROM pg_trigger
  WHERE NOT tgisinternal
    AND tgname IN ('profiles_set_updated_at','user_access_assignments_set_updated_at');
  IF trigger_count <> 2 THEN
    RAISE EXCEPTION 'GGSP 003 FAIL: expected 2 update triggers, found %', trigger_count;
  END IF;
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint
    WHERE conrelid = 'public.user_access_assignments'::regclass
      AND conname = 'user_access_assignments_unique_grant' AND contype = 'u'
  ) THEN
    RAISE EXCEPTION 'GGSP 003 FAIL: unique assignment constraint is missing';
  END IF;
  IF EXISTS (
    SELECT 1 FROM pg_class
    WHERE oid IN ('public.profiles'::regclass,'public.user_access_assignments'::regclass)
      AND NOT relrowsecurity
  ) THEN
    RAISE EXCEPTION 'GGSP 003 FAIL: RLS is not enabled on all IAM tables';
  END IF;
END
$verify$;

COMMIT;
SELECT 'PASS' AS status, '003_unified_access' AS migration;
