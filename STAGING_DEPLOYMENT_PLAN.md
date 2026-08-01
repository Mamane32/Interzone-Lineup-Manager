# GGSP — Staging Deployment Plan

Status: **planning/preparation only.** Nothing in this document has been
executed. No production system was touched. Nothing has been committed —
this file and its companions (`.env.staging.example`,
`STAGING_DEPLOYMENT_CHECKLIST.md`) sit in the working tree, uncommitted,
for review.

Scope: a brand-new, isolated Supabase project for staging (confirmed
decision), deployed to Vercel from this repository, verified end-to-end
before any production deployment is even discussed.

---

## Correction to the prior review

The previous staging-readiness review (`STAGING_DEPLOYMENT_CHECKLIST.md`,
first version) said to skip `supabase/schema.sql` and run migrations
`002`–`015` in full. **That guidance was wrong** — it was based on a
table-name spot check, not a full read of every migration file. This
document replaces it with the verified sequence below.

The actual situation, confirmed by reading all 14 migration files and
`schema.sql` in full:

- `schema.sql`'s own header states it "documents the FINAL state of every
  table after migrations 002–007 have all applied" — it is a **merged
  snapshot of migrations 002 through 007**, not an independent or
  competing artifact.
- Every `CREATE TYPE` statement in migrations `002`, `003`, `004`, `006`,
  and `007` is **already present, verbatim, in `schema.sql`**. PostgreSQL's
  `CREATE TYPE` has no `IF NOT EXISTS` clause — running `schema.sql` and
  then migrations `002`–`007` in the same database would fail immediately
  on the first duplicate type.
- Migrations `008` through `015` are all genuinely new — none of their
  columns, tables, or types exist in `schema.sql`. Confirmed individually:
  `008` adds the competition-hierarchy columns to `matches` (not in
  schema.sql), `009` adds `slot_key` (not present), `010` adds
  `coach_photo_url` + the `coach-photos` bucket (not present), `011` adds
  the `additional_time` enum value (not present in the enum's value list),
  `012` adds five buckets (only `team-logos` is in schema.sql), `013`
  creates `production_queue` (absent), `014` adds four official-name
  columns to `matches` (absent), `015` creates `match_statistics`
  (absent).

**Verified correct bootstrap sequence for a brand-new, empty database:**

```
1. supabase/schema.sql                          (baseline = migrations 002–007, merged)
2. supabase/migrations/008_competition_completion.sql
3. supabase/migrations/009_formation_engine.sql
4. supabase/migrations/010_coach_photo.sql
5. supabase/migrations/011_additional_time_event.sql
6. supabase/migrations/012_image_upload_buckets.sql
7. supabase/migrations/013_production_queue.sql
8. supabase/migrations/014_match_officials.sql
9. supabase/migrations/015_match_statistics.sql
```

Do **not** run `002` through `007` as separate files after `schema.sql` —
they will fail on duplicate `CREATE TYPE`. Do **not** skip `schema.sql` —
there is no other file in this repository that creates the foundational
tables (`teams`, `players`, `matches`, `lineups`, `competitions`, the
`platform_role`/`access_status` enums, etc.); migrations `002`+ all assume
they already exist.

`supabase/deploy/deploy.ps1` remains unusable for staging (hardcoded to a
different project ref, and its package list only covers `002`–`006`) — see
"Hidden blockers" below for the one piece of it that *is* still reusable.

---

## Migration sequence — dependency verification detail

Every file below was read in full, not just grepped. Function/type/table
references were checked against what exists by the time each file runs.

| # | File | Creates / alters | Depends on (already present by this point?) |
|---|---|---|---|
| — | `schema.sql` | 19 tables, 11 enum types, `pgcrypto` extension, `team-logos` bucket, shared `set_updated_at()` trigger function, `create_lineups_for_match()` trigger, audit-log immutability triggers, `role_metadata` seed rows | Nothing — this is the baseline |
| 008 | `008_competition_completion.sql` | `matches.season_id/division_id/stage_id/group_id/venue_id`, `check_match_hierarchy_consistency()` trigger | `matches`, `seasons`, `divisions`, `stages`, `competition_groups`, `venues` — all in `schema.sql` ✓ |
| 009 | `009_formation_engine.sql` | `tactical_positions.slot_key`, partial unique index | `tactical_positions` — in `schema.sql` ✓ |
| 010 | `010_coach_photo.sql` | `teams.coach_photo_url`, `coach-photos` bucket | `teams` — in `schema.sql` ✓ |
| 011 | `011_additional_time_event.sql` | `ALTER TYPE match_event_type ADD VALUE 'additional_time'` | `match_event_type` — in `schema.sql` ✓. **Must run as its own statement/transaction** (see caution below) |
| 012 | `012_image_upload_buckets.sql` | 5 storage buckets | Nothing new — pure `INSERT INTO storage.buckets` |
| 013 | `013_production_queue.sql` | `production_queue` table, `set_updated_at()` trigger | `matches` ✓, `set_updated_at()` function — defined in `schema.sql` ✓ |
| 014 | `014_match_officials.sql` | 4 nullable columns on `matches` | `matches` ✓ |
| 015 | `015_match_statistics.sql` | `match_statistics` table, `create_match_statistics_for_match()` trigger, backfill insert | `matches`, `teams` ✓, `set_updated_at()` ✓ |

**Caution — `011`'s `ALTER TYPE ... ADD VALUE`:** PostgreSQL forbids using
a newly added enum value inside the same transaction that added it. Run
each numbered file as its own separate execution (its own Supabase SQL
Editor paste-and-run, or its own `psql -f` invocation) — do not
concatenate all nine files into one script and run them as a single
transaction. This is also just the discipline the migrations already
document ("Run this AFTER X.sql").

**Functions used by 008–015, and where they're defined:**
`set_updated_at()` (used by `013`, `015`) — defined once in `schema.sql`'s
consolidated trigger section. Migrations `002`–`007`'s own differently-named
duplicates (`set_updated_at_profiles`, `set_updated_at_tactical_formations`)
are never referenced by `008`–`015`, so skipping `002`–`007` entirely
creates no dangling function reference.

**Extension requirement:** `schema.sql` includes
`create extension if not exists "pgcrypto";`, which every table's
`gen_random_uuid()` default depends on. `pgcrypto` is always available on
Supabase projects and needs no dashboard step — the SQL handles it.

**RLS:** every table created by `schema.sql` and every table created by
`008`–`015` has `ALTER TABLE ... ENABLE ROW LEVEL SECURITY` in the same
file that creates it. Zero `CREATE POLICY` statements exist anywhere in
the schema — confirmed by grep across all 14 migration files plus
`schema.sql`. This is deliberate, existing architecture: every table is
service-role-only; the anon key cannot read or write any application data
table regardless of RLS policy state, because there are no policies
granting it anything. Nothing to configure here beyond what the SQL
already does.

---

## Storage buckets — complete list

All created by the sequence above (`schema.sql` + `010` + `012`), all
`public: true` (anonymous read, matching how logos/photos render
platform-wide without a signed URL), all writes exclusively through the
service-role client (`lib/image-upload.ts` — a pure server-side upload,
confirmed no browser-to-storage direct upload path exists anywhere in the
app, so **no CORS configuration is needed** on any bucket):

| Bucket | Created by | Max file size (app-enforced) |
|---|---|---|
| `team-logos` | `schema.sql` | 5 MB, image/* only |
| `coach-photos` | `010` | 5 MB, image/* only |
| `organization-logos` | `012` | 5 MB, image/* only |
| `organization-banners` | `012` | 5 MB, image/* only |
| `competition-logos` | `012` | 5 MB, image/* only |
| `venue-photos` | `012` | 5 MB, image/* only |
| `user-avatars` | `012` | 5 MB, image/* only |

The 5 MB / image-type check is enforced in application code
(`lib/image-upload.ts`), not at the Supabase project level — no dashboard
storage limit needs to be lowered or raised to match it (Supabase's
project-wide default is well above 5 MB).

---

## Supabase Dashboard configuration — every section, in order

Perform these **after** running the migration sequence above, on the new
staging project. None of this touches the production project.

### 1. Authentication → Providers → Email

- Leave **Enable Email provider** on (default) — this app has no other
  auth provider and no public self-signup; every account is created by an
  admin or via invite.
- **Confirm email** toggle: this app never routes a real end-user through
  Supabase's public signup form, so this setting has no practical effect
  on this app's flows either way. Leave at the project default.

### 2. Authentication → URL Configuration

- **Site URL**: set to the staging app's URL (e.g.
  `https://ggsp-staging.vercel.app`, or your actual staging domain — must
  match `NEXT_PUBLIC_APP_URL` exactly, no trailing slash).
- **Redirect URLs**: add `https://<staging-domain>/auth/callback`. This is
  not optional — `supabase.auth.resetPasswordForEmail()` and
  `admin.inviteUserByEmail()` both reject (or silently redirect to Site
  URL instead) any `redirectTo` not on this allowlist, regardless of what
  the app sends. Every invite/reset email in this app builds its
  `redirectTo` as `${NEXT_PUBLIC_APP_URL}/auth/callback?next=...` — the
  base path is always exactly `/auth/callback`.

### 3. Authentication → Emails (Email Templates)

The app only ever triggers two of Supabase's built-in email flows:
**Invite user** (`admin.inviteUserByEmail`) and **Reset password**
(`resetPasswordForEmail`). It never triggers Magic Link or Confirm
Signup.

- Leave both templates' default `{{ .ConfirmationURL }}` variable in
  place — do not hand-edit the URL structure. The app's
  `app/auth/callback/route.ts` was built this sprint to handle **both**
  shapes Supabase can produce for that URL (a `?code=` query param or a
  `#access_token=` fragment), so no specific Auth flow-type setting is
  required for this app to work — confirmed by testing both shapes
  against real generated links.
- Cosmetic only, optional: update the sender name / subject line copy to
  say "GGSP Staging" or similar, so test emails are visually
  distinguishable from anything a real production system might one day
  send from the same inbox provider.

### 4. Authentication → Emails → SMTP Settings

**Required, not optional, for any real staging QA.** Supabase's built-in
email sender has a low default rate limit intended only for light
development use — this project hit it directly during a single QA pass
last sprint (a handful of invite/reset sends in one sitting was enough to
trigger `over_email_send_rate_limit`). Any real staging verification pass
(the checklist below sends at least 2–3 real emails) will hit the same
wall on the default sender.

- Toggle **Enable Custom SMTP**.
- Fill in Sender email, Sender name, Host, Port, Username, Password for
  whatever SMTP provider you use (Resend, Postmark, SES, etc. — any
  standard SMTP-compatible provider works; the app has no
  provider-specific code, this is entirely a Supabase-side setting).
- Send a test email from this same dashboard panel before moving on, to
  confirm the SMTP credentials work in isolation from the app.

### 5. Storage → Buckets

Nothing to do here manually — running the migration sequence above
creates all 7 buckets already set to public. Use this page only to
**verify** after migrating: 7 buckets present, each showing "Public"
status.

### 6. Storage → Policies

Nothing to configure. Public buckets serve anonymous `GET`/read requests
automatically without any policy; every write goes through the
service-role key from server code, which bypasses RLS/storage policies
entirely by design. Confirmed zero `storage.objects` policies exist
anywhere in the migration set — this is consistent, not an oversight to
fix.

### 7. Database → Extensions

Nothing to do — `schema.sql`'s `create extension if not exists "pgcrypto"`
handles this automatically when the migration sequence runs.

### 8. Project Settings → API

This is where you'll copy the three Supabase-side values needed for
Vercel: **Project URL**, **anon/public key**, **service_role key** — see
the env var template below.

---

## Hidden blockers found during this review

1. **The `011` enum-value transaction rule** (above) — a real failure mode
   if migrations are pasted as one giant script instead of run file by
   file. Documented in the checklist as an explicit step-by-step
   requirement, not an assumption.

2. **`NEXT_PUBLIC_*` variables are baked in at Vercel *build* time, not
   read at runtime.** All required env vars must be set in Vercel's
   project settings, scoped to whichever environment staging deploys
   through, **before** the first build/deploy runs — setting them after a
   build won't retroactively fix that build's bundle. A redeploy is
   required if they're added or changed later.

3. **`supabase/deploy/packages/bootstrap_super_admin.deploy.sql` is
   reusable on its own**, even though the `deploy.ps1` wrapper around it
   is not. The project-ref safety check lives only in the PowerShell
   script, not in this `.sql` file itself. It can be run directly —
   `psql <staging-connection-string> -v admin_email='you@example.com' -f supabase/deploy/packages/bootstrap_super_admin.deploy.sql`
   — against the new staging project once the migration sequence has run
   and a real `auth.users` row for that email exists (created via
   Dashboard → Authentication → Users → **Add user**, or the Admin API).
   Its own preflight check confirms the required tables/types exist
   before doing anything, and its own postflight check confirms exactly
   one active `super_admin` grant exists afterward — it fails loudly
   rather than silently on any mismatch.

4. **No file in this repo creates the very first admin account's
   underlying `auth.users` row.** Every bootstrap path (the script above,
   or manual SQL) assumes that row already exists. This has to happen via
   the Supabase Dashboard or Admin API first, as its own explicit step —
   see the checklist.

5. **This repo has no `vercel.json`, `Dockerfile`, or other
   hosting-specific config.** It's a stock Next.js 14 app (`package.json`
   pins Node `20.x`) — Vercel auto-detects it with zero configuration
   needed beyond the env vars below. Confirmed no `output: "export"` or
   other static-export setting in `next.config.mjs` that would conflict
   with the app's use of Server Actions, cookies, and middleware.

6. **No page in the app performs a Supabase/DB call outside a request** —
   confirmed by checking every `page.tsx` that doesn't already opt into
   `export const dynamic = "force-dynamic"` (`app/access-denied`,
   `app/admin/login`, `app/invitation`, `app/page.tsx` — the only four).
   All four are static marketing/landing shells with no `await`, no
   Supabase import. `next build` will not attempt to reach the staging
   database and cannot fail because staging's database isn't ready yet —
   the two are decoupled, so provisioning order between "run migrations"
   and "trigger first Vercel build" doesn't matter for build success
   (though the app won't be *usable* until both are done).

7. **`SUPABASE_DB_URL` is not an application runtime variable.** It only
   exists locally for manually running `psql`-based migration/bootstrap
   commands. Do not add it to Vercel's environment variables — it's a
   direct Postgres connection string with full database access and has no
   reason to be reachable from the deployed app process.

None of the above required any code change — every finding here is a
sequencing, configuration, or documentation gap, not an application bug.

---

## Known technical debt — deliberately not addressed this pass

**`supabase/deploy/deploy.ps1`'s project-ref lock and incomplete package
list (migrations `002`–`006` only) stay exactly as they are.** Explicit
decision: the existing hardcoded safety check that refuses to run against
any project ref other than the current production one is a deliberate
guard, and it stays in place — untouched — until **both** staging and
production have been deployed and validated end-to-end. Do not generalize,
parameterize, or extend this script before then; doing so now would be
tooling work ahead of product validation, not in service of it.

What this means in practice for staging: `deploy.ps1` is not used for
staging at all (see Phase 2/4 of the checklist — migrations are run
directly, and `bootstrap_super_admin.deploy.sql` is invoked standalone,
bypassing the wrapper entirely, which is already safe since the ref lock
lives only in the PowerShell wrapper, not in that `.sql` file). Nothing
about staging readiness depends on `deploy.ps1` changing.

Revisit only after production deployment is itself being planned as real,
scheduled work — not as a preparatory or "nice to have" step during
staging validation.
