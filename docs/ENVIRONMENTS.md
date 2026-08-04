# GGSP — Environments & Reserved System Accounts

The permanent reference for environment separation across the GGSP /
Interzone Lineup Manager project, and for the system accounts reserved in
each one. Update this file whenever an environment's shape changes —
don't let it drift out of sync with reality.

---

## Environments

### Development

- **Where it runs**: locally, via `npm run dev`.
- **Configuration**: `.env.local` (gitignored, never committed — see
  `.env.staging.example` for the variable shapes it needs).
- **Database**: whichever Supabase project the individual developer has
  configured locally. Never shared, never authoritative for anything.
- **Purpose**: day-to-day development and manual testing before anything
  reaches staging.

### Staging

- **Vercel project**: `good-grafik-s-projects/interzone-lineup-manager`,
  **Preview** environment (not Production).
- **Deploys from**: the `ggsp/sprint2-formation-engine-coach-experience`
  branch, currently triggered manually via `npx vercel` (the CLI uploads
  the current local working tree directly) rather than Vercel's GitHub
  integration — that integration is not yet auto-deploying pushes to this
  branch; see `STAGING_DEPLOYMENT_PLAYBOOK.md`'s "Post-staging follow-up"
  section for the tracked follow-up.
- **URL**: `https://interzone-lineup-manager-darodebass-4844-good-grafik-s-projects.vercel.app`
  — a stable, account-scoped Vercel alias (confirmed to repoint to each
  new deploy automatically). **Documented as temporary**, not a permanent
  custom domain — see the same Playbook section. Deployment Protection
  (Vercel Authentication) is disabled for this project so the URL is
  reachable without a Vercel login, for QA/browser testing.
- **Database**: a dedicated, isolated staging Supabase project — never the
  production project. Bootstrapped via `supabase/schema.sql` then
  migrations `008`–`017` in sequence, each applied and verified as its own
  standalone execution.
- **Environment variables**: `NEXT_PUBLIC_SUPABASE_URL`,
  `NEXT_PUBLIC_SUPABASE_ANON_KEY`, `SUPABASE_URL`,
  `SUPABASE_SERVICE_ROLE_KEY`, `NEXT_PUBLIC_APP_URL` — scoped to
  **Preview only** in Vercel, pointing at the staging Supabase project.
  Never shared with Production's scope.
- **SMTP**: deferred (documented, tracked as a post-staging task) —
  invitations and password-recovery emails use Supabase's built-in
  rate-limited sender until custom SMTP is configured.
- **Required Supabase Auth redirect configuration** (environment
  prerequisite, not something the application can compensate for):
  Authentication → URL Configuration in the staging Supabase project must
  have **Site URL** set to the current staging URL above, and **Redirect
  URLs** must include an entry that matches
  `<staging-url>/auth/callback` for every path this app actually
  requests — critically, the app appends a `?next=...` query string to
  every `redirectTo` it sends (see `app/admin/invitations/actions.ts`,
  `app/admin/users/[userId]/actions.ts`'s `forcePasswordReset`,
  `app/login/actions.ts`). Confirmed via live testing (Sprint 3 Phase 1
  validation, 2026-08-02): a `redirectTo` that Supabase's allowlist
  doesn't accept silently falls back to the project's default Site URL —
  which, if never explicitly changed, is Supabase's own out-of-the-box
  default of `http://localhost:3000`. This produced a real
  `#error=access_denied&error_code=user_banned` redirect to `localhost`
  during that validation pass. Whenever a fresh staging Supabase project
  is provisioned (or the staging URL changes — see "Documented as
  temporary" above), this must be re-verified: send a real recovery/invite
  link and confirm it lands on the staging domain, not `localhost`, before
  trusting any email-dependent flow.
- **Purpose**: the validated pre-production environment. Every sprint
  phase is deployed and verified here — full regression + end-to-end
  scenarios — before it's considered a baseline.

### Production

- **Vercel project**: same project, **Production** environment.
- **Deploys from**: the `main` branch.
- **URL**: `https://interzone-lineup-manager.vercel.app`.
- **Database**: the live production Supabase project — real
  organizations, competitions, teams, users. Never touched by staging
  work, never receives staging's env vars or migrations except through
  the deliberate, guarded production deploy path.
- **Deploy tooling**: `supabase/deploy/deploy.ps1` — locked to the
  production project ref as a deliberate safety mechanism, kept unchanged
  and out of scope for refactoring until both staging and production are
  fully validated (documented technical debt: the migration package list
  it covers is incomplete, tracked, not urgent).
- **Purpose**: what real users and real competitions actually run on.
  Nothing lands here without having first passed staging's full
  validation cycle.

---

## Reserved system accounts

### `super_admin` (staging: `darodebass@gmail.com`)

- Platform administration only.
- **Never deleted.**
- **Never used for routine QA.**
- **Never used for Force Password Reset testing** — this account is also
  the currently-authenticated admin session in most manual QA passes;
  running Force Password Reset against it would self-lock the very
  session doing the testing, on top of being the wrong account for the
  job by policy.

### `qa-staging` (`qa-staging@interzone.local`)

- The official, **permanent** staging regression account — created once,
  reused across sprints instead of spinning up and deleting a fresh
  throwaway account for every regression pass.
- **Role**: `viewer` (least-privilege by default — a deliberately
  low-authority account, not an admin stand-in).
- **Status**: `active`.
- Used for regression testing across: authentication, invitations,
  permissions, password reset (including Force Password Reset /
  session-invalidation verification), broadcast, media, and future
  statistics/media-workspace testing as those phases ship.
- **Staging only.** Never promoted to production, never included in
  production seed data, never granted elevated roles as a shortcut during
  testing — if a test needs a different role, create a separate
  purpose-scoped account rather than escalating this one.

**Recreating this account** (e.g. on a freshly provisioned staging
project) — two steps, no email delivery required, so it works regardless
of whether SMTP is configured:

1. Supabase Dashboard → Authentication → Users → **Add user** →
   `qa-staging@interzone.local`, set a password directly in the dashboard
   (never in chat/AI tooling), **Auto Confirm User: ON**.
2. Run once in the SQL Editor, as a single standalone execution:

   ```sql
   insert into public.profiles (id, email, status)
   select id, email, 'active'::access_status
   from auth.users
   where lower(email) = lower('qa-staging@interzone.local')
   on conflict (id) do update set status = 'active'::access_status;

   insert into public.user_access_assignments (user_id, role_key, status)
   select id, 'viewer'::platform_role, 'active'::access_status
   from auth.users
   where lower(email) = lower('qa-staging@interzone.local')
   on conflict (user_id, role_key, team_id) do update set status = 'active'::access_status;
   ```

Verify with: `select email, status from public.profiles where email = 'qa-staging@interzone.local';`
and confirm `status = 'active'` and a `viewer` row exists in
`user_access_assignments` for that `user_id`.
