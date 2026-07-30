\set ON_ERROR_STOP on
\echo 'GGSP 006 | PREFLIGHT'

SELECT (
  to_regtype('public.foundation_status') IS NOT NULL
  AND to_regtype('public.competition_type') IS NOT NULL
  AND to_regtype('public.competition_gender') IS NOT NULL
  AND to_regtype('public.stage_type') IS NOT NULL
  AND to_regtype('public.venue_surface_type') IS NOT NULL
  AND to_regclass('public.organizations') IS NOT NULL
  AND to_regclass('public.seasons') IS NOT NULL
  AND to_regclass('public.divisions') IS NOT NULL
  AND to_regclass('public.stages') IS NOT NULL
  AND to_regclass('public.competition_groups') IS NOT NULL
  AND to_regclass('public.venues') IS NOT NULL
  AND (SELECT count(*) FROM information_schema.columns
       WHERE table_schema = 'public' AND table_name = 'competitions'
         AND column_name IN (
           'organization_id','short_name','slug','description','logo_url','competition_type',
           'sport','gender','age_category','timezone','match_duration','halftime_duration',
           'extra_time_enabled','penalties_enabled','points_win','points_draw','points_loss',
           'status','updated_at'
         )) = 19
) AS already_applied
\gset
\if :already_applied
  SELECT 'PASS' AS status, '006_competition_foundation' AS migration, 'ALREADY_APPLIED' AS result;
  \quit 0
\endif

DO $preflight$
BEGIN
  IF to_regclass('public.competitions') IS NULL
     OR to_regclass('public.user_access_assignments') IS NULL
     OR to_regclass('public.invitations') IS NULL
     OR to_regprocedure('public.set_updated_at_profiles()') IS NULL THEN
    RAISE EXCEPTION 'GGSP 006 FAIL: baseline or IAM prerequisites are missing';
  END IF;
  IF to_regtype('public.foundation_status') IS NOT NULL
     OR to_regtype('public.competition_type') IS NOT NULL
     OR to_regtype('public.competition_gender') IS NOT NULL
     OR to_regtype('public.stage_type') IS NOT NULL
     OR to_regtype('public.venue_surface_type') IS NOT NULL
     OR to_regclass('public.organizations') IS NOT NULL
     OR to_regclass('public.seasons') IS NOT NULL
     OR to_regclass('public.divisions') IS NOT NULL
     OR to_regclass('public.stages') IS NOT NULL
     OR to_regclass('public.competition_groups') IS NOT NULL
     OR to_regclass('public.venues') IS NOT NULL THEN
    RAISE EXCEPTION 'GGSP 006 FAIL: migration objects already or partially exist';
  END IF;
  IF EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_schema = 'public' AND table_name = 'competitions'
      AND column_name IN (
        'organization_id','short_name','slug','description','logo_url','competition_type',
        'sport','gender','age_category','timezone','match_duration','halftime_duration',
        'extra_time_enabled','penalties_enabled','points_win','points_draw','points_loss',
        'status','updated_at'
      )
  ) THEN
    RAISE EXCEPTION 'GGSP 006 FAIL: competition foundation columns already or partially exist';
  END IF;
END
$preflight$;

BEGIN;
SELECT pg_advisory_xact_lock(hashtext('ggsp-production-migrations'));
\ir ../../migrations/006_competition_foundation.sql

DO $verify$
DECLARE column_count integer; trigger_count integer;
BEGIN
  IF to_regtype('public.foundation_status') IS NULL
     OR to_regtype('public.competition_type') IS NULL
     OR to_regtype('public.competition_gender') IS NULL
     OR to_regtype('public.stage_type') IS NULL
     OR to_regtype('public.venue_surface_type') IS NULL
     OR to_regclass('public.organizations') IS NULL
     OR to_regclass('public.seasons') IS NULL
     OR to_regclass('public.divisions') IS NULL
     OR to_regclass('public.stages') IS NULL
     OR to_regclass('public.competition_groups') IS NULL
     OR to_regclass('public.venues') IS NULL THEN
    RAISE EXCEPTION 'GGSP 006 FAIL: foundation enums or tables are incomplete';
  END IF;
  SELECT count(*) INTO column_count
  FROM information_schema.columns
  WHERE table_schema = 'public' AND table_name = 'competitions'
    AND column_name IN (
      'organization_id','short_name','slug','description','logo_url','competition_type',
      'sport','gender','age_category','timezone','match_duration','halftime_duration',
      'extra_time_enabled','penalties_enabled','points_win','points_draw','points_loss',
      'status','updated_at'
    );
  IF column_count <> 19 THEN
    RAISE EXCEPTION 'GGSP 006 FAIL: expected 19 competition columns, found %', column_count;
  END IF;
  SELECT count(*) INTO trigger_count FROM pg_trigger
  WHERE NOT tgisinternal AND tgname IN (
    'organizations_set_updated_at','competitions_set_updated_at','seasons_set_updated_at',
    'divisions_set_updated_at','stages_set_updated_at',
    'competition_groups_set_updated_at','venues_set_updated_at'
  );
  IF trigger_count <> 7 THEN
    RAISE EXCEPTION 'GGSP 006 FAIL: expected 7 foundation triggers, found %', trigger_count;
  END IF;
  IF EXISTS (
    SELECT 1 FROM public.competitions
    WHERE sport IS NULL OR match_duration IS NULL OR halftime_duration IS NULL
       OR points_win IS NULL OR points_draw IS NULL OR points_loss IS NULL OR status IS NULL
  ) THEN
    RAISE EXCEPTION 'GGSP 006 FAIL: an existing competition has invalid foundation defaults';
  END IF;
  IF EXISTS (
    SELECT 1 FROM pg_class
    WHERE oid IN (
      'public.organizations'::regclass,'public.seasons'::regclass,
      'public.divisions'::regclass,'public.stages'::regclass,
      'public.competition_groups'::regclass,'public.venues'::regclass
    ) AND NOT relrowsecurity
  ) THEN
    RAISE EXCEPTION 'GGSP 006 FAIL: RLS is not enabled on all foundation tables';
  END IF;
END
$verify$;

COMMIT;
SELECT 'PASS' AS status, '006_competition_foundation' AS migration;
