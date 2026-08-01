# GGSP — Final Staging Deployment Playbook

Consolidated execution plan. Database bootstrap (`schema.sql` + migrations
`008`–`015`) is already complete and fully verified — this playbook covers
everything remaining: code sync, Supabase Dashboard config, Vercel config,
first deploy, QA, rollback, and acceptance criteria.

Nothing in this file has been executed. No code is modified by this
playbook itself.

---

## 0. Pre-flight — sync code to git

Vercel deploys from a git branch, not your local working copy. Two real
fixes made during this engagement are currently **uncommitted**:

- `supabase/schema.sql` — the dependency-order fix, now live-validated
  against the real staging project
- `components/live/MatchTimelineEvent.tsx` — dead `EVENT_META` re-export
  removed

Plus four new untracked docs (`.env.staging.example`,
`DEPLOYMENT_READINESS_REPORT.md`, `STAGING_DEPLOYMENT_CHECKLIST.md`,
`STAGING_DEPLOYMENT_PLAN.md`).

`schema.sql` itself is never executed by the deployed app (you ran it
manually via SQL Editor), so its commit status doesn't affect the Vercel
build. `MatchTimelineEvent.tsx` **is** app code — if it isn't pushed,
Vercel builds the stale version (harmless today, but not what was
verified).

**Action**: when you're ready, tell me explicitly to commit and push these
changes to `ggsp/sprint2-formation-engine-coach-experience` (or wherever
Vercel's staging deploy is configured to build from — confirm that branch
first). I will not do this automatically.

```bash
git status
git add supabase/schema.sql components/live/MatchTimelineEvent.tsx
git add .env.staging.example DEPLOYMENT_READINESS_REPORT.md STAGING_DEPLOYMENT_CHECKLIST.md STAGING_DEPLOYMENT_PLAN.md STAGING_DEPLOYMENT_PLAYBOOK.md
git commit -m "..."
git push
```

Confirm which branch/environment Vercel's staging project actually
deploys from before pushing — if it's a different branch than your
current one, push there instead.

---

## 1. Exact execution order

1. **Pre-flight** — confirm branch, commit + push (§0)
2. **Local safety gate** — run the full quality gate once more (§2)
3. **Supabase Dashboard — Auth & Email config** (§3)
4. **Create the staging `super_admin`** (§3, local `psql` command)
5. **Vercel Dashboard — environment variables** (§4)
6. **Trigger the first deploy** (§4)
7. **Post-deploy smoke check** (§5, first 2 items)
8. **Full end-to-end QA sequence** (§5)
9. **Accept or roll back** based on §7's criteria

Do not skip ahead — each step assumes the previous one is confirmed.

---

## 2. Local commands (run before pushing)

```bash
npm run typecheck
npm run lint
npm run test
npm run build
```

`typecheck` and `tests/migrations` were already re-confirmed clean during
the readiness audit; running the **full** suite (`lint`, `test`, `build`)
once more here is the last local checkpoint before anything goes to a
shared branch. `npm run build` in particular catches anything Vercel's
build step would catch, without waiting on a real deploy to find out.

No `vercel` CLI commands are required — this plan uses the Vercel
Dashboard throughout, consistent with everything already configured. If
you prefer the CLI (`vercel --prod` / `vercel env add`), it's a drop-in
substitute for §4, not a different plan.

---

## 3. Supabase Dashboard actions, in order

1. **Authentication → URL Configuration**
   - Site URL → your staging app's URL (must match `NEXT_PUBLIC_APP_URL`
     exactly, no trailing slash — you won't have the real Vercel URL
     until after §4, so either use a placeholder custom domain you've
     already decided on, or come back to this step after the first
     deploy gives you the `*.vercel.app` URL)
   - Redirect URLs → add `https://<staging-domain>/auth/callback`
2. **Authentication → Emails → SMTP Settings**
   - Enable Custom SMTP, fill in a real provider's credentials
   - Send the panel's built-in test email and confirm it actually arrives
     (required — Supabase's default sender rate-limits, already diagnosed
     earlier this sprint)
3. **Authentication → Users → Add user**
   - Create the auth account for staging's first `super_admin`. Note the
     exact email — you'll need it for the next command.
4. **Bootstrap that account as `super_admin`** — run locally, not through
   `deploy.ps1` (it's locked to the production project ref):

```bash
psql <staging-connection-string> -v admin_email='<the email from step 3>' -f supabase/deploy/packages/bootstrap_super_admin.deploy.sql
```

   Confirm it prints `PASS | super_admin bootstrap | <email>`.

---

## 4. Vercel Dashboard actions, in order

1. Project Settings → Environment Variables → add all 5 required values
   from `.env.staging.example`, using this staging project's **real**
   values (Project Settings → API in Supabase), scoped to whichever
   environment staging deploys through
2. Confirm `NEXT_PUBLIC_APP_URL` exactly matches the Site URL from §3.1
3. Confirm `SUPABASE_DB_URL` is **not** present in Vercel
4. Confirm which git branch this Vercel project/environment deploys from
   (needed for §0)
5. Trigger the deploy — either push to that branch (if §0 hasn't happened
   yet, do it now) or use Vercel's "Redeploy" if a build already exists
6. Watch the build log to completion — confirm zero errors

If §3.1's Site URL was a placeholder because you didn't have the real
Vercel URL yet: once the deploy finishes, go back to Supabase
Authentication → URL Configuration and update Site URL + Redirect URLs to
the actual deployed domain, then continue to §5.

---

## 5. First end-to-end QA sequence (real browser only)

Smoke check first:

- [ ] App loads with no `supabaseAdmin()` "missing env var" error on any
      page
- [ ] Sign in at `/admin/login` with the §3 `super_admin` account

Then the full sequence:

- [ ] `/admin/invitations` → send a real invitation → confirm the email
      arrives (proves SMTP + Redirect URL allowlist together)
- [ ] Click the real emailed invite link → lands on
      `/team/reset-password` → set password → lands on the correct
      workspace
- [ ] Forgot-password flow end-to-end, both the unified login form and
      the Coach Portal form
- [ ] Upload one image on each of the 7 upload surfaces (organization
      logo, organization banner, competition logo, venue photo, team
      logo, coach photo, user avatar)
- [ ] `/live/[matchId]` as broadcast_operator — log a goal, a card, and a
      substitution; confirm Timeline, Statistics, and the Graphics/
      Production Queue all update
- [ ] `/broadcast-output/[matchId]/program` and `/preview` — open
      directly by URL both logged in and logged out; logged-out must
      redirect
- [ ] `/match/[matchId]` for a match with events, logged out — renders
      with no auth prompt, full timeline and statistics visible
- [ ] Walk every Command Center nav item once: Matches, Teams, Lineups,
      Venues, Seasons, Divisions, Stages, Groups, Users, Invitations,
      Roles, Access, Audit Log, Settings
- [ ] Teams page → copy a coach share link → confirm it uses the correct
      staging domain
- [ ] If any `NEXT_PUBLIC_BROADCAST_*`/`VMIX_*` vars are set, confirm
      Broadcast Center reflects them; if unset, confirm the honest "Not
      Configured" state

Do not mark any item done from code inspection — every box requires a
real browser action and a real observed result.

---

## 6. Rollback plan

Staging has no real user data yet, so every failure mode here has a cheap
fix — nothing is destructive or hard to reverse at this stage.

**Build fails on Vercel** — No live traffic is ever routed to a failed
build (Vercel's deploys are atomic; a broken build never replaces a
working one). Read the build log, fix the specific error in a new commit,
push, redeploy. No Supabase-side action needed.

**Build succeeds but the app shows a "missing env var" error** — An env
var is missing or misspelled in Vercel. Fix it in Project Settings →
Environment Variables, then **trigger a new deploy** — `NEXT_PUBLIC_*`
values are baked in at build time, so a redeploy is required even though
no code changed.

**A single QA step fails and it's clearly a Supabase Dashboard setting**
(e.g., invite email never arrives → SMTP misconfigured) — fix that one
Dashboard setting, retest only that step. No redeploy needed.

**A QA step fails and it's a real code defect** — Stop. Do not guess.
Identify the exact root cause first (matching the discipline used
throughout the migration validation), fix only that defect, commit, push,
let Vercel auto-redeploy, then re-run the full §5 sequence from the top —
a code change can have effects outside the one step that surfaced it.

**The staging database itself turns out wrong somehow** — Since this
project is brand-new and disposable, the safe move demonstrated already
in this engagement applies again: discard the project, provision a fresh
one, re-run the now-verified `schema.sql` → `008`–`015` sequence. This is
a known-good, already-executed path, not a new risk.

**Nothing here should ever touch the production Supabase project or
`deploy.ps1`** — they are entirely uninvolved in staging and stay that
way regardless of what fails.

---

## 7. Success criteria — staging accepted

Staging is accepted only when **all** of the following are true, observed
live:

- [ ] Vercel build completed with zero errors
- [ ] App loads with no missing-env-var error on any page
- [ ] Every item in §5's full QA sequence passes, in a real browser
- [ ] No console errors on any page tested
- [ ] Invitation and password-recovery emails are actually delivered
      (not just reported as "sent" by Supabase)
- [ ] The Coach share link resolves to the correct staging domain
- [ ] Every upload surface writes to its real bucket and the resulting
      image renders back in the UI
- [ ] Broadcast output routes correctly enforce auth when accessed
      directly by URL, logged out
- [ ] Public Match Center renders fully with zero auth prompt

Once every box is checked, staging is done. Production deployment is a
separate, later decision — nothing here authorizes or prepares that.
