\set ON_ERROR_STOP on
\echo 'GGSP 002 | PREFLIGHT'

SELECT (
  to_regtype('public.match_live_status') IS NOT NULL
  AND to_regtype('public.match_event_type') IS NOT NULL
  AND to_regclass('public.match_events') IS NOT NULL
  AND to_regclass('public.match_events_match_idx') IS NOT NULL
  AND to_regclass('public.match_events_type_idx') IS NOT NULL
  AND (SELECT count(*) FROM information_schema.columns
       WHERE table_schema = 'public' AND table_name = 'matches'
         AND column_name IN ('live_status','home_score','away_score','referee_name','venue')) = 5
) AS already_applied
\gset
\if :already_applied
  SELECT 'PASS' AS status, '002_live_center' AS migration, 'ALREADY_APPLIED' AS result;
  \quit 0
\endif

DO $preflight$
BEGIN
  IF to_regclass('public.matches') IS NULL
     OR to_regclass('public.teams') IS NULL
     OR to_regclass('public.players') IS NULL THEN
    RAISE EXCEPTION 'GGSP 002 FAIL: baseline matches/teams/players tables are required';
  END IF;
  IF NOT EXISTS (SELECT 1 FROM pg_extension WHERE extname = 'pgcrypto') THEN
    RAISE EXCEPTION 'GGSP 002 FAIL: pgcrypto extension is required';
  END IF;
  IF to_regtype('public.match_live_status') IS NOT NULL
     OR to_regtype('public.match_event_type') IS NOT NULL
     OR to_regclass('public.match_events') IS NOT NULL THEN
    RAISE EXCEPTION 'GGSP 002 FAIL: migration objects already or partially exist';
  END IF;
  IF EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_schema = 'public' AND table_name = 'matches'
      AND column_name IN ('live_status','home_score','away_score','referee_name','venue')
  ) THEN
    RAISE EXCEPTION 'GGSP 002 FAIL: one or more target match columns already exist';
  END IF;
END
$preflight$;

BEGIN;
SELECT pg_advisory_xact_lock(hashtext('ggsp-production-migrations'));
\ir ../../migrations/002_live_center.sql

DO $verify$
BEGIN
  IF to_regtype('public.match_live_status') IS NULL
     OR to_regtype('public.match_event_type') IS NULL
     OR to_regclass('public.match_events') IS NULL
     OR to_regclass('public.match_events_match_idx') IS NULL
     OR to_regclass('public.match_events_type_idx') IS NULL THEN
    RAISE EXCEPTION 'GGSP 002 FAIL: required objects were not created';
  END IF;
  IF (SELECT count(*) FROM information_schema.columns
      WHERE table_schema = 'public' AND table_name = 'matches'
        AND column_name IN ('live_status','home_score','away_score','referee_name','venue')) <> 5 THEN
    RAISE EXCEPTION 'GGSP 002 FAIL: match columns are incomplete';
  END IF;
  IF EXISTS (SELECT 1 FROM public.matches
             WHERE live_status IS NULL OR home_score IS NULL OR away_score IS NULL) THEN
    RAISE EXCEPTION 'GGSP 002 FAIL: an existing match has invalid live defaults';
  END IF;
  IF NOT (SELECT relrowsecurity FROM pg_class WHERE oid = 'public.match_events'::regclass) THEN
    RAISE EXCEPTION 'GGSP 002 FAIL: RLS is not enabled on match_events';
  END IF;
END
$verify$;

COMMIT;
SELECT 'PASS' AS status, '002_live_center' AS migration;
