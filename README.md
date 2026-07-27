# Interzone Lineup Manager

A lightweight lineup-collection tool for football broadcast production.
Coaches get a private link (no login, no account), fill in their Starting XI,
Substitutes, and Captain in Haitian Creole, and the production team gets an
instant, structured export ready to paste into vMix.

> **New to GitHub and Vercel?** Skip the command-line instructions below and
> use **[GITHUB_AND_VERCEL_GUIDE.md](./GITHUB_AND_VERCEL_GUIDE.md)** instead —
> a full, click-by-click walkthrough using the GitHub Desktop app, written for
> total beginners.

> **Coach Portal redesign (Sprint 1)?** See
> **[SPRINT_1_COACH_PORTAL.md](./SPRINT_1_COACH_PORTAL.md)** for what changed,
> why, and the schema-safe design decisions behind coach login, and
> **[SPRINT_1_UI_POLISH.md](./SPRINT_1_UI_POLISH.md)** for the follow-up
> visual polish pass (dynamic team theming, premium match cards, animations).

> **Broadcast Control Center / Live Center (Sprint 2)?** See
> **[SPRINT_2_LIVE_CENTER.md](./SPRINT_2_LIVE_CENTER.md)** for the
> architecture, the new (additive-only) database migration, and what's real
> vs. placeholder.

> **Broadcast Control Center premium UI upgrade (Sprint 2.1)?** See
> **[SPRINT_2_1_LIVE_CENTER_UPGRADE.md](./SPRINT_2_1_LIVE_CENTER_UPGRADE.md)**
> for the dynamic branding system, the renamed product surface, and the
> full deliverables/acceptance-criteria report.

> **Unified login & role-based access (Sprint 1.2)?** See
> **[SPRINT_1_2_UNIFIED_AUTH.md](./SPRINT_1_2_UNIFIED_AUTH.md)** — read
> this before deploying if you have an existing installation, it includes
> a critical migration-ordering step or your administrator will be locked
> out of `/admin`.

---

## Stack

- **Next.js 14** (App Router) + TypeScript
- **Tailwind CSS**
- **Supabase**
  - **Auth** (email/password) — gates the single administrator account
  - **Postgres** — all application data (competitions, teams, players,
    matches, lineups), accessed only from the server via the service-role
    key. Row Level Security is enabled on every table with **no public
    policies**, so the browser can never read or write data directly.
  - **Storage** — team logo uploads (public read bucket)

---

## 1. Create a Supabase project

Go to [supabase.com](https://supabase.com) → New project. Note your **Project
URL**, **anon public key**, and **service_role key** (Project Settings → API)
— you'll need all three.

## 2. Run the database schema

Open the Supabase SQL editor and run the full contents of
`supabase/schema.sql`. This creates:

- `competitions`, `teams`, `players`, `matches`, `lineups` tables
- the `lineup_status` enum (`waiting` / `submitted` / `needs_correction`)
- a trigger that auto-creates a `waiting` lineup row for both teams the
  moment a match is scheduled
- RLS enabled on every table, with no policies — the service-role key is the
  only way in
- a public `team-logos` storage bucket

Then run `supabase/migrations/002_live_center.sql` (adds the Broadcast
Control Center's `match_events` table and a handful of new, nullable/
defaulted columns on `matches` — additive only, safe on an existing
database; see `SPRINT_2_LIVE_CENTER.md` for details).

Then run `supabase/migrations/003_unified_access.sql` (adds `profiles` and
`user_access_assignments` — the role/access model behind the unified
login; additive only. **Do not skip step 3 below after running this** —
see the warning there).

## 3. Create the administrator account

The app has exactly one administrator, authenticated with Supabase Auth
(email + password) — there's no in-app sign-up flow.

1. In the Supabase dashboard, go to **Authentication → Providers → Email**
   and turn **off** "Allow new users to sign up" (this app never needs
   self-registration).
2. Go to **Authentication → Users → Add user** and create the one
   administrator with an email and password.
3. **Required:** open the SQL editor and run (replacing the email):
   ```sql
   insert into profiles (id, email, status)
   select id, email, 'active' from auth.users where email = 'admin@example.com'
   on conflict (id) do nothing;

   insert into user_access_assignments (user_id, role_key, status)
   select id, 'admin', 'active' from auth.users where email = 'admin@example.com';
   ```
   ⚠️ Skipping this step locks the administrator out of `/admin` — every
   admin page now checks for a real `admin` role assignment, not just a
   valid login. See `SPRINT_1_2_UNIFIED_AUTH.md` for why.
4. Sign in at `/login` (the unified login — `/admin/login` still works too).
   To change the password later, edit the user in Supabase Authentication →
   Users — no redeploy needed.

## 4. Configure environment variables

Copy `.env.example` to `.env.local` and fill in:

```
NEXT_PUBLIC_SUPABASE_URL=https://your-project.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=your-anon-key

SUPABASE_URL=https://your-project.supabase.co
SUPABASE_SERVICE_ROLE_KEY=your-service-role-key

NEXT_PUBLIC_APP_URL=https://lineup.interzone.ht
```

- `NEXT_PUBLIC_SUPABASE_URL` / `NEXT_PUBLIC_SUPABASE_ANON_KEY` — public,
  used only to establish the administrator's login session.
- `SUPABASE_URL` / `SUPABASE_SERVICE_ROLE_KEY` — **server-only secrets**,
  used for every read/write of application data. Never expose these to the
  browser or commit them to source control.
- `NEXT_PUBLIC_APP_URL` — the domain used to build each coach's private
  link (`<NEXT_PUBLIC_APP_URL>/team/<token>`).

## 5. Install and run locally

```bash
npm install
npm run dev
```

Visit `http://localhost:3000/admin/login` and sign in with the account you
created in step 3.

## 6. Deploy

Deploy to any Next.js host — Vercel is the simplest. For a full step-by-step
walkthrough with checkboxes, see **[DEPLOYMENT_CHECKLIST.md](./DEPLOYMENT_CHECKLIST.md)**.

Short version:

1. Push this project to a Git repository and import it in Vercel (or run
   `vercel` from the project root).
2. In the Vercel project's **Settings → Environment Variables**, add the
   same five variables from step 4, using your production
   `NEXT_PUBLIC_APP_URL` (e.g. `https://lineup.interzone.ht`).
3. Deploy. Point your domain at the Vercel project.
4. In Supabase → **Authentication → URL Configuration**, add your production
   URL to the allowed redirect/site URLs.

No further setup is needed — the database schema and storage bucket from
step 2 are already live.

A GitHub Actions workflow (`.github/workflows/ci.yml`) installs
dependencies, lints, type-checks, and runs a full production build
(`next build`) on every push — that's the real build verification, run
with full network access. It should stay green before you deploy.

---

## How it works

- **Admin** (signed in via Supabase Auth) creates competitions, teams (with
  squad lists and a logo), and matches. Creating a match automatically
  creates a `waiting` lineup row for both the home and away team.
- **Coach** never creates an account or signs in. The admin shares
  `https://lineup.interzone.ht/team/<token>` (one-click Copy Link or
  WhatsApp share, both built in). Opening it shows that team's current
  match and an entirely-Creole form: **11 Titilè**, **Ranplasan**,
  **Kapitèn**, **Remak**, and a green **VOYE LIS LA** button. The token
  itself — checked server-side — is the coach's only credential.
- Submitting locks the page and shows: "✅ Lis ekip la voye avèk siksè.
  Mèsi." The admin dashboard updates instantly: 🟢 Submitted, 🟡 Waiting,
  🔴 Needs Correction (after the admin reopens a submission for a fix).
- **Exports**: on any lineup's detail page, the admin gets three
  ready-to-use formats — **Simple List**, **vMix**
  (`PLAYER01=...`, `SUB01=...`, `CAPTAIN=...`), and **Plain Text** — each
  with one-click Copy and Download.

## Project structure

```
.github/workflows/ci.yml   Install, lint, type-check, and build on every push
app/
  admin/            Administrator dashboard (auth-protected by middleware.ts)
    login/          Supabase Auth sign-in
    dashboard/      🟢🟡🔴 submission status board
    competitions/   Create/rename/delete competitions
    teams/          Create/edit teams, manage each squad list, coach link
    matches/         Schedule matches (auto-creates lineup rows)
    lineups/        Review a submission, lock/reopen, export
    settings/
  team/[token]/     The coach page — no auth, entirely in Haitian Creole
components/ui/       Shared UI: Button, Card, Select, StatusBadge, jersey badge, etc.
lib/
  supabase/         Auth-aware Supabase clients (session check only)
  supabase-admin.ts Service-role client — all application data reads/writes
  token.ts          Server-only private-link token generator
  types.ts          Shared TypeScript types
  utils.ts          Client-safe formatting and export-format builders
supabase/schema.sql  Full database schema, RLS, triggers, storage bucket
middleware.ts        Protects /admin/* using the Supabase Auth session
DEPLOYMENT_CHECKLIST.md   Step-by-step Supabase + Vercel checklist
```

## Scope

This intentionally does **not** include player statistics, transfers,
league tables, messaging, or coach authentication — see the original spec.
It is a lineup collection tool for broadcast production, not a football
management platform.
