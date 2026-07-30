\set ON_ERROR_STOP on
\if :{?admin_email}
\else
  \error 'GGSP BOOTSTRAP FAIL: admin_email psql variable is required'
\endif

\echo 'GGSP SUPER_ADMIN | PREFLIGHT'

DO $preflight$
DECLARE matching_users integer;
BEGIN
  IF to_regclass('public.profiles') IS NULL
     OR to_regclass('public.user_access_assignments') IS NULL
     OR to_regclass('public.role_metadata') IS NULL
     OR to_regclass('public.organizations') IS NULL
     OR to_regclass('public.venues') IS NULL
     OR to_regtype('public.platform_role') IS NULL
     OR to_regtype('public.access_status') IS NULL THEN
    RAISE EXCEPTION 'GGSP BOOTSTRAP FAIL: migrations 002-006 are not complete';
  END IF;
END
$preflight$;

BEGIN;
SELECT pg_advisory_xact_lock(hashtext('ggsp-production-migrations'));
SELECT set_config('ggsp.bootstrap_email', :'admin_email', true);

DO $validate_user$
DECLARE matching_users integer;
BEGIN
  SELECT count(*) INTO matching_users
  FROM auth.users
  WHERE lower(email) = lower(current_setting('ggsp.bootstrap_email'));
  IF matching_users <> 1 THEN
    RAISE EXCEPTION 'GGSP BOOTSTRAP FAIL: expected exactly 1 auth user for %, found %',
      current_setting('ggsp.bootstrap_email'), matching_users;
  END IF;
END
$validate_user$;

INSERT INTO public.profiles (id, email, status)
SELECT id, email, 'active'::access_status
FROM auth.users
WHERE lower(email) = lower(current_setting('ggsp.bootstrap_email'))
ON CONFLICT (id) DO UPDATE
SET email = EXCLUDED.email,
    status = 'active'::access_status,
    updated_at = now();

UPDATE public.user_access_assignments
SET status = 'active'::access_status,
    updated_at = now()
WHERE user_id = (
  SELECT id FROM auth.users
  WHERE lower(email) = lower(current_setting('ggsp.bootstrap_email'))
)
AND role_key = 'super_admin'::platform_role;

INSERT INTO public.user_access_assignments (user_id, role_key, status)
SELECT id, 'super_admin'::platform_role, 'active'::access_status
FROM auth.users u
WHERE lower(u.email) = lower(current_setting('ggsp.bootstrap_email'))
  AND NOT EXISTS (
    SELECT 1
    FROM public.user_access_assignments a
    WHERE a.user_id = u.id
      AND a.role_key = 'super_admin'::platform_role
  );

DO $verify$
DECLARE valid_grants integer;
BEGIN
  SELECT count(*) INTO valid_grants
  FROM auth.users u
  JOIN public.profiles p ON p.id = u.id AND p.status = 'active'
  JOIN public.user_access_assignments a
    ON a.user_id = u.id
   AND a.role_key = 'super_admin'
   AND a.status = 'active'
  WHERE lower(u.email) = lower(current_setting('ggsp.bootstrap_email'));

  IF valid_grants <> 1 THEN
    RAISE EXCEPTION 'GGSP BOOTSTRAP FAIL: expected one active super_admin grant, found %',
      valid_grants;
  END IF;
END
$verify$;

COMMIT;
SELECT 'PASS' AS status, 'super_admin bootstrap' AS operation, :'admin_email' AS email;
