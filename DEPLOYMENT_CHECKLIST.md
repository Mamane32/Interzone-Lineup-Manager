# Deployment Checklist

Follow these in order. Each section assumes the previous one is done.
Full context for each step is in `README.md`.

## ☐ 1. Supabase project

- [ ] Create a project at [supabase.com](https://supabase.com)
- [ ] Open **SQL Editor** → run the entire contents of `supabase/schema.sql`
- [ ] Then run `supabase/migrations/002_live_center.sql` (Broadcast Control
      Center — additive only, safe to run on top of the schema above)
- [ ] Then run `supabase/migrations/003_unified_access.sql` (unified
      login's role model — additive only)
- [ ] Then run `supabase/migrations/004_iam_foundation.sql` (Identity &
      Access Management — additive only, seeds `role_metadata`)
- [ ] Then run `supabase/migrations/005_iam_hardening.sql` (invitation
      traceability + audit-log immutability trigger — additive only)
- [ ] Confirm these exist afterward:
  - [ ] Tables: `competitions`, `teams`, `players`, `matches`, `lineups`, `match_events`, `profiles`, `user_access_assignments`, `invitations`, `audit_logs`, `role_metadata`
  - [ ] Enum types `lineup_status`, `match_live_status`, `match_event_type`, `access_status`, `platform_role`, `invitation_status`
  - [ ] Triggers `matches_create_lineups`, `audit_logs_no_update`,
        `audit_logs_no_delete` (Database → Triggers)
  - [ ] Storage bucket `team-logos`, marked **public** (Storage tab)
  - [ ] RLS shows **enabled** with **0 policies** on every table, including
        `profiles`, `user_access_assignments`, `invitations`, `audit_logs`,
        and `role_metadata` (Authentication → Policies) — this is
        intentional, not a mistake

## ☐ 2. Administrator account (Supabase Auth)

- [ ] Authentication → Providers → Email → turn **off**
      "Allow new users to sign up"
- [ ] Authentication → Users → **Add user** → create the one
      administrator (email + password)
- [ ] **Required — do not skip:** SQL Editor → run, replacing the email:
      ```sql
      insert into profiles (id, email, status)
      select id, email, 'active' from auth.users where email = 'admin@example.com'
      on conflict (id) do nothing;

      insert into user_access_assignments (user_id, role_key, status)
      select id, 'admin', 'active' from auth.users where email = 'admin@example.com';
      ```
      ⚠️ Every admin page now checks for a real `admin` role assignment,
      not just a valid login — skipping this locks the administrator out
      of `/admin` entirely. See `SPRINT_1_2_UNIFIED_AUTH.md`.
- [ ] Save that email/password somewhere safe — it's the only way into
      `/admin` (via `/login` or `/admin/login`, both work)

## ☐ 3. Collect your keys

From Project Settings → API, copy:

- [ ] Project URL
- [ ] `anon` `public` key
- [ ] `service_role` key (⚠️ keep this secret — never commit it, never
      prefix it with `NEXT_PUBLIC_`)

## ☐ 4. Push to GitHub

> Prefer clicking buttons over typing commands? Use
> **[GITHUB_AND_VERCEL_GUIDE.md](./GITHUB_AND_VERCEL_GUIDE.md)** instead,
> which covers this entire checklist using the GitHub Desktop app. The
> steps below are the command-line equivalent.

- [ ] `git init` (if not already a repo)
- [ ] Confirm `.env.local` is **not** tracked (`.gitignore` already
      excludes it — double-check with `git status`)
- [ ] `git add . && git commit -m "Initial commit"`
- [ ] Create a repo on GitHub and push:
      `git remote add origin <your-repo-url> && git push -u origin main`
- [ ] Confirm the **CI workflow** (`.github/workflows/ci.yml`) runs green
      on the push — this is your real build verification, run by GitHub
      with full network access (installs deps, lints, type-checks, and
      runs `next build`)

## ☐ 5. Import into Vercel

- [ ] [vercel.com/new](https://vercel.com/new) → import the GitHub repo
- [ ] Framework preset: **Next.js** (auto-detected, no changes needed)
- [ ] Add environment variables (Project Settings → Environment
      Variables), for **Production**, **Preview**, and **Development**:

  | Variable | Value | Notes |
  |---|---|---|
  | `NEXT_PUBLIC_SUPABASE_URL` | your Project URL | public |
  | `NEXT_PUBLIC_SUPABASE_ANON_KEY` | your `anon` key | public |
  | `SUPABASE_URL` | your Project URL | server-only |
  | `SUPABASE_SERVICE_ROLE_KEY` | your `service_role` key | server-only, secret |
  | `NEXT_PUBLIC_APP_URL` | your production domain, e.g. `https://lineup.interzone.ht` | used to build coach links |

- [ ] Click **Deploy**

## ☐ 6. Point your domain (optional)

- [ ] Vercel → Project → Settings → Domains → add
      `lineup.interzone.ht` (or whichever domain you use)
- [ ] Update DNS per Vercel's instructions
- [ ] Once the domain is live, update `NEXT_PUBLIC_APP_URL` in Vercel's
      environment variables to match it exactly, then redeploy (coach
      links are built from this value)

## ☐ 7. Authorize the domain in Supabase

- [ ] Supabase → Authentication → URL Configuration → set **Site URL** to
      your production URL
- [ ] Under **Redirect URLs**, add `<your domain>/auth/callback` (and
      `<your domain>/**` as a wildcard is fine too) — this is required for
      the coach "forgot password" email and the admin's "Send coach login
      invite" button to work; without it, Supabase rejects those emailed
      links

## ☐ 8. Smoke test in production

- [ ] Visit `/admin/login`, sign in with the account from step 2
- [ ] Create a competition
- [ ] Create two teams (try uploading a logo on one) — coach email is
      now required, since it's the Coach Portal login identity
- [ ] Create a match between the two teams
- [ ] Confirm each team's private link opens the new **landing page** at
      `/team/<token>` in an incognito window (simulating a coach — no
      login yet), showing the team/opponent match card and a LOGIN button
- [ ] From a team's admin detail page, click **Send coach login invite**
      and confirm the coach receives the invite email
- [ ] Open the invite link in an incognito window, set a password on
      `/team/reset-password`, and confirm it lands on that team's
      **dashboard**
- [ ] On the dashboard, confirm: coach name, team identity, countdown to
      next match, lineup status, upcoming matches list, and the
      notifications bell all render
- [ ] Try opening a **different** team's dashboard URL while logged in as
      this coach — confirm it redirects to that other team's login
      instead of showing its data (this is the coach-isolation check)
- [ ] Use the bottom nav to visit Calendar and Profile; from Profile,
      change the password and confirm re-login works with the new one
- [ ] From the dashboard's **Soumèt Lis** quick action, open the lineup
      page and submit a lineup, confirm:
  - [ ] The confirmation message appears and the page locks
  - [ ] The admin dashboard flips that team to 🟢 Submitted
  - [ ] The admin lineup detail page shows all three export formats correctly
  - [ ] Copy and Download both work on each export format
- [ ] From the admin lineup detail page, click **Reopen for correction**
      and confirm the coach's lineup page becomes editable again and the
      admin dashboard shows 🔴 Needs Correction
- [ ] From the coach login page, use **Ou bliye modpas ou?** (forgot
      password), confirm the reset email arrives and the link works

## ☐ 9. Smoke test — Live Center

- [ ] From Admin → Matches, click **Live Center** on a scheduled match (or
      visit `/live` directly)
- [ ] Confirm the Match Header shows both team logos, 0–0, and Pre Match
- [ ] Click through a few **Match Status** buttons and confirm the top-nav
      status pill updates and shows "LIVE" once past Kick Off
- [ ] Add a goal via **Score Control** (pick a team → confirm minute →
      Confirm Goal); confirm the score updates and the event appears in
      the **Timeline** on the right
- [ ] Click **Undo Last Goal** and confirm the score reverts
- [ ] Add a Yellow Card and a Substitution via **Match Events**; confirm
      both appear in the Timeline and filtering (Cards / Subs) works
- [ ] Switch the center tabs (Statistics / Teams / Broadcast / Highlights)
      and confirm Teams shows the real submitted lineup (or "Lineup not
      submitted yet" if none exists)
- [ ] Use the **Bottom Quick Controls** to add a goal and advance status
      from a different control than the ones already tested
- [ ] Open **Report** from the top nav and confirm the final score,
      timeline, goals/cards/substitutions lists, and squads all match what
      you just entered
- [ ] Confirm `/team/<token>` (Coach Portal landing page) still loads
      normally and is unaffected by any of the above

## ☐ 10. Smoke test — Unified login & role-based access

- [ ] Visit `/login` and sign in with the administrator account — confirm
      it lands on `/admin/dashboard` (not a workspace picker, since the
      admin has exactly one assignment)
- [ ] Sign out, then visit `/admin` directly while logged out — confirm
      it redirects to `/admin/login`, not a blank or broken page
- [ ] Sign in as a coach (via a team's invite or existing credentials) at
      `/login` — confirm it lands on that team's `/team/<token>/dashboard`
      directly, no picker shown
- [ ] While signed in as that coach, manually visit `/admin` in the same
      browser — confirm you're redirected away (this is the fix: a coach
      session must never reach the admin area)
- [ ] Same check for `/live` — a coach session should not be able to open
      the Broadcast Control Center either
- [ ] In Supabase, manually grant one real user a **second** active
      assignment (any role) — sign in as them at `/login` and confirm
      `/select-workspace` appears showing only their two options, and
      that picking one lands correctly
- [ ] From `/login`, click "Forgot your password?", request a reset,
      follow the email link, set a new password, and confirm you land
      back in the correct workspace afterward

## ☐ 11. Smoke test — Identity & Access Management

- [ ] Sign in as the administrator, visit `/admin/users` — confirm the
      admin account itself appears in the list
- [ ] Search by a partial name/email, confirm results narrow correctly;
      clear the search and confirm the full list returns
- [ ] Filter by role and by status, confirm both narrow the list; use
      **Clear** to reset
- [ ] Open a user's detail page, confirm Overview/Access/Activity all
      render, and that editing the full name saves successfully
- [ ] Suspend a test user, confirm the confirmation dialog appears, then
      confirm their status badge updates; reactivate them
- [ ] Visit `/admin/invitations`, send a test invite, confirm it appears
      as "Pending" — if email isn't configured yet, confirm the page shows
      the honest configuration warning rather than silently claiming success
- [ ] Visit `/admin/roles`, confirm all 8 roles show with live user counts
      that match reality
- [ ] Visit `/admin/access`, confirm the legacy-coach-fallback warning (if
      any teams still rely on it) lists real team names with a working
      link to Invitations
- [ ] Visit `/admin/audit-log`, confirm the actions above (suspend,
      invite, etc.) all appear with correct actor/action/timestamp

## ☐ 12. Handoff

- [ ] Share the admin email/password with whoever will run the
      production desk, through a secure channel (not Slack/email in
      plain text)
- [ ] Bookmark the Supabase dashboard for anyone who'll need to add a
      second administrator later (Authentication → Users → Add user)

---

If anything fails, check the CI run logs first (step 4) — a red CI run
means the problem is in the code, not the deployment, and will fail on
Vercel the same way.
