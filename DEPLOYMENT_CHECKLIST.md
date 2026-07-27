# Deployment Checklist

Follow these in order. Each section assumes the previous one is done.
Full context for each step is in `README.md`.

## ☐ 1. Supabase project

- [ ] Create a project at [supabase.com](https://supabase.com)
- [ ] Open **SQL Editor** → run the entire contents of `supabase/schema.sql`
- [ ] Confirm these exist afterward:
  - [ ] Tables: `competitions`, `teams`, `players`, `matches`, `lineups`
  - [ ] Enum type `lineup_status`
  - [ ] Trigger `matches_create_lineups` (Database → Triggers)
  - [ ] Storage bucket `team-logos`, marked **public** (Storage tab)
  - [ ] RLS shows **enabled** with **0 policies** on every table
    (Authentication → Policies) — this is intentional, not a mistake

## ☐ 2. Administrator account (Supabase Auth)

- [ ] Authentication → Providers → Email → turn **off**
      "Allow new users to sign up"
- [ ] Authentication → Users → **Add user** → create the one
      administrator (email + password)
- [ ] Save that email/password somewhere safe — it's the only way into
      `/admin`

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

## ☐ 9. Handoff

- [ ] Share the admin email/password with whoever will run the
      production desk, through a secure channel (not Slack/email in
      plain text)
- [ ] Bookmark the Supabase dashboard for anyone who'll need to add a
      second administrator later (Authentication → Users → Add user)

---

If anything fails, check the CI run logs first (step 4) — a red CI run
means the problem is in the code, not the deployment, and will fail on
Vercel the same way.
