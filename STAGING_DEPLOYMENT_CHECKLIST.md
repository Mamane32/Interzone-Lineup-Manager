# GGSP — Staging Deployment Checklist

Follow in order. Nothing here has been executed — this is the step-by-step
companion to `STAGING_DEPLOYMENT_PLAN.md`, which has the full rationale,
migration-dependency detail, and hidden-blocker writeup for each step
below. Do not deploy to production from this checklist — it targets a
brand-new, isolated staging Supabase project only.

*(This file replaces an earlier version that incorrectly said to skip
`supabase/schema.sql`. See "Correction to the prior review" at the top of
`STAGING_DEPLOYMENT_PLAN.md` for why that was wrong.)*

---

## Phase 1 — Provision the staging Supabase project

- [ ] Create a new Supabase project for staging (separate from whatever
      project the current `.env.local` targets)
- [ ] Note the new project's **Project URL**, **anon key**, and
      **service_role key** (Project Settings → API) — you'll need these
      in Phase 4

## Phase 2 — Run the migration sequence

Run each file as its **own separate execution** (own SQL Editor
paste-and-run, or own `psql -f` call) — do not concatenate into one
script (see the plan doc's note on migration `011`'s enum-value rule).

- [ ] 1. `supabase/schema.sql`
- [ ] 2. `supabase/migrations/008_competition_completion.sql`
- [ ] 3. `supabase/migrations/009_formation_engine.sql`
- [ ] 4. `supabase/migrations/010_coach_photo.sql`
- [ ] 5. `supabase/migrations/011_additional_time_event.sql`
- [ ] 6. `supabase/migrations/012_image_upload_buckets.sql`
- [ ] 7. `supabase/migrations/013_production_queue.sql`
- [ ] 8. `supabase/migrations/014_match_officials.sql`
- [ ] 9. `supabase/migrations/015_match_statistics.sql`
- [ ] Verify: Table Editor shows all 21 tables (19 from schema.sql +
      `production_queue` + `match_statistics`)
- [ ] Verify: Storage → Buckets shows all 7 buckets, each marked "Public"

## Phase 3 — Supabase Dashboard configuration

Full detail for each item is in the plan doc's "Supabase Dashboard
configuration" section.

- [ ] Authentication → URL Configuration → **Site URL** set to the
      staging app URL
- [ ] Authentication → URL Configuration → **Redirect URLs** includes
      `https://<staging-domain>/auth/callback`
- [ ] Authentication → Emails → **SMTP Settings** → Enable Custom SMTP,
      fill in a real provider's credentials, send a test email from this
      panel and confirm it arrives
- [ ] (Optional) Authentication → Emails → Email Templates — cosmetic
      sender name/subject tweak only, no structural change

## Phase 4 — Create the first staging admin

- [ ] Dashboard → Authentication → Users → **Add user** (or the Admin
      API) — create the auth account for whoever will be staging's first
      `super_admin`. Note the exact email used.
- [ ] Run the bootstrap script directly against the staging connection
      string (do **not** go through `deploy.ps1` — it's locked to a
      different project ref):
      ```
      psql <staging-connection-string> -v admin_email='<the email above>' -f supabase/deploy/packages/bootstrap_super_admin.deploy.sql
      ```
- [ ] Confirm it printed `PASS | super_admin bootstrap | <email>`

## Phase 5 — Configure Vercel

- [ ] Copy `.env.staging.example` values into Vercel → Project Settings →
      Environment Variables, scoped to the environment staging deploys
      through. Use the staging Supabase project's real values from Phase
      1, not placeholders.
- [ ] Confirm `NEXT_PUBLIC_APP_URL` exactly matches the Site URL set in
      Phase 3 (no trailing slash)
- [ ] Do **not** add `SUPABASE_DB_URL` to Vercel
- [ ] Confirm which git ref/branch this Vercel project/environment
      deploys from
- [ ] Trigger the deploy (env vars must already be set — see the plan
      doc's blocker #2 on `NEXT_PUBLIC_*` build-time baking)

## Phase 6 — Live verification

Real browser only, matching this project's own established QA standard —
do not mark any of these done from code reading alone.

- [ ] App loads with no `supabaseAdmin()` "missing env var" error on any
      page
- [ ] Sign in at `/admin/login` with the Phase 4 super_admin account
- [ ] `/admin/invitations` → send a real invitation → confirm the email
      actually arrives (proves SMTP + Redirect URL allowlist together)
- [ ] Click the real emailed invite link → lands on
      `/team/reset-password` → set password → lands on the correct
      workspace (proves `/auth/callback` + `/auth/callback/session`
      against this project's actual Auth flow)
- [ ] Forgot-password flow end-to-end, both the unified login form and
      the Coach Portal form
- [ ] Upload one image on each of the 6 upload surfaces (organization
      logo, organization banner, competition logo, venue photo, team
      logo, coach photo, user avatar) — confirms all 7 buckets work
- [ ] `/live/[matchId]` as broadcast_operator — log a goal, a card, and a
      substitution; confirm Timeline, Statistics, and the Graphics queue
      all update
- [ ] `/broadcast-output/[matchId]/program` and `/preview` — open
      directly by URL both logged in and logged out; logged-out must
      redirect (this route bypasses middleware and relies on its own
      page-level `requireRole()` check — see plan doc)
- [ ] `/match/[matchId]` for a match with events, logged out — renders
      with no auth prompt, no crash, full timeline and statistics visible
- [ ] Walk every Command Center nav item once: Matches, Teams, Lineups,
      Venues, Seasons, Divisions, Stages, Groups, Users, Invitations,
      Roles, Access, Audit Log, Settings
- [ ] Teams page → Copy a coach share link → confirm it uses the correct
      staging domain (proves `NEXT_PUBLIC_APP_URL` is wired correctly
      beyond just the auth redirect)
- [ ] If any `NEXT_PUBLIC_BROADCAST_*` / `VMIX_*` vars are set for this
      environment, confirm the Broadcast Center header reflects them; if
      unset, confirm it shows the honest "Not Configured" state rather
      than an error

---

## Only once every box above is checked

Staging is verified. Report back before any discussion of a production
deployment — this checklist explicitly does not cover production, and
none of its steps touch it.
