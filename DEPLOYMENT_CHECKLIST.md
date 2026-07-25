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

- [ ] Supabase → Authentication → URL Configuration → add your Vercel
      production URL (and custom domain, once attached) to
      **Site URL** / **Redirect URLs**

## ☐ 8. Smoke test in production

- [ ] Visit `/admin/login`, sign in with the account from step 2
- [ ] Create a competition
- [ ] Create two teams (try uploading a logo on one)
- [ ] Confirm each team's private link opens correctly at `/team/<token>`
      in an incognito window (simulating a coach — no login)
- [ ] Create a match between the two teams
- [ ] Confirm the dashboard shows both teams as 🟡 Waiting
- [ ] Submit a lineup from one team's coach link, confirm:
  - [ ] The confirmation message appears and the page locks
  - [ ] The dashboard flips that team to 🟢 Submitted
  - [ ] The lineup detail page shows all three export formats correctly
  - [ ] Copy and Download both work on each export format
- [ ] From the lineup detail page, click **Reopen for correction** and
      confirm the coach link becomes editable again and the dashboard
      shows 🔴 Needs Correction

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
