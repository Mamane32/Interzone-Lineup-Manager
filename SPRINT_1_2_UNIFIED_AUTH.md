# Sprint 1.2 — Unified Portal Authentication & Role-Based Access

## 1. Concise summary

Added a real role/access model (`profiles` + `user_access_assignments`,
additive migration) on top of the existing single Supabase Auth user pool,
and a unified login (`/login`) with a centralized redirect resolver
(`resolveUserDestination`). Critically, this closes a real pre-existing gap:
`/admin` and `/live` previously only checked "is anyone logged in" —
**any** authenticated user, including a coach, could reach them. Every
admin page, every admin server action, the Live Center's layout/index, and
every Live Center server action now call a real role check
(`requireAdmin()` / `requireRole()`).

Existing Admin authentication (Supabase Auth via `/admin/login`) and Coach
authentication (`/team/<token>/login`) were **not replaced** — both still
work exactly as before for signing in. What changed is what happens
*after* sign-in: authorization is now a real database check instead of
"a session exists" (admin/live) or "the email matches a text column"
(coach — kept as a documented fallback, not deleted).

## 2. Files created

`supabase/migrations/003_unified_access.sql` ·
`lib/access.ts` · `components/auth/LoginForm.tsx` ·
`components/auth/ComingSoonWorkspace.tsx` ·
`app/login/{page.tsx,actions.ts}` · `app/login/forgot-password/page.tsx` ·
`app/select-workspace/{page.tsx,actions.ts}` ·
`app/competition/page.tsx` · `app/referee/page.tsx` · `app/media/page.tsx`

## 3. Files modified

`lib/types.ts` (added `AccessStatus`, `PlatformRole`, `Profile`,
`UserAccessAssignment`) · `lib/coach-auth.ts` (assignment-first,
email-match fallback) · `lib/branding.ts` (doc comment scope widened to
cover `/login`, no code change) · `middleware.ts` (session-presence
coverage extended to the new routes) · `app/team/[token]/login/actions.ts`
(same dual-check as `lib/coach-auth.ts`) ·
`app/team/reset-password/actions.ts` (generalized to route through the
resolver when there's no team token, so it can serve as the shared reset
landing) · `app/admin/login/page.tsx` (added a forgot-password link — sign-in
mechanism itself untouched) · `app/admin/teams/[id]/actions.ts`
(`inviteCoach` now also creates a real assignment row) · **all 8 admin
page files** and **all 5 admin actions files** (role check added — see §12)
· **`app/live/[matchId]/layout.tsx`, `app/live/page.tsx`, and
`app/live/[matchId]/actions.ts`** (role check added — see §12)

## 4. Database migrations added

`supabase/migrations/003_unified_access.sql` — additive only:
- `access_status` enum, `platform_role` enum
- `profiles` table (id → `auth.users`, email, full_name, avatar_url,
  status, timestamps)
- `user_access_assignments` table (user_id, role_key, competition_id,
  team_id, status, timestamps), unique on (user_id, role_key, team_id)
- A one-time backfill: any team whose `coach_email` matches a real
  `auth.users` row gets a `profiles` row + a `coach` assignment
- A documented (not automatic) admin-bootstrap SQL block — see §16 for
  why this can't be automated from here, and the **critical deployment
  ordering warning** in the migration file itself

## 5. RLS policies added or modified

**None added.** Both new tables have RLS **enabled with zero public
policies** — the same posture as every other table in this project
(`competitions`, `teams`, `players`, `matches`, `lineups`, `match_events`).
All reads go through the service-role client from trusted server helpers
in `lib/access.ts`, exactly like every other authorization check already
in this codebase. This was a deliberate choice, documented in the
migration file, to stay consistent with the established architecture
rather than run two authorization models (RLS policies + server-side
checks) side by side.

## 6. Existing authentication components reused

`@supabase/ssr`'s `createServerClient`, `lib/supabase/server.ts`'s
`createClient()`, `lib/supabase-admin.ts`'s service-role client,
`lib/supabase/middleware.ts`'s `updateSession()`, the entire
`/auth/callback` PKCE-exchange route from Sprint 1, and the
`/team/reset-password` page (generalized, not duplicated). No new
Supabase client was created.

## 7. Unified login route

`/login` — neutral "Portal Login" branding (reads `organizationName` from
`lib/branding.ts`, not hardcoded), email + password, show/hide password,
loading/disabled-submit state, inline validation, clear error messages,
`autoComplete="email"`/`"current-password"`, keyboard-submittable,
password-manager compatible (native `<input>` elements, not custom
widgets that break autofill).

## 8. Forgot-password route

`/login/forgot-password` — email submission, always shows the same
"check your email" response regardless of whether the address exists.
Uses `supabase.auth.resetPasswordForEmail` with the existing
`/auth/callback` PKCE exchange, landing on `/team/reset-password`.

## 9. Password-reset route

`/team/reset-password` (existing route, generalized) — new password +
confirmation, 8-character minimum, mismatch/short/failure error states,
redirects through `resolveUserDestination` when reached without a team
token (the unified-login path) or straight to that team's dashboard when
reached with one (the coach-invite path — unchanged behavior).

## 10. Logout implementation

`unifiedSignOut()` in `app/login/actions.ts` — `supabase.auth.signOut()`
then redirect to `/login`. Used by `/select-workspace` and the three
placeholder portals. Existing `logout()` (admin) and `coachLogout()`
(coach, token-scoped) were left as-is per "preserve existing" — both still
work and both end the same underlying Supabase session.

## 11. Role/access resolver details

`lib/access.ts`:
- `getSessionUser()` — current Supabase Auth user or null (memoized/request)
- `getProfile(userId)`, `getActiveAssignments(userId)` — service-role
  reads, memoized per request with React `cache()`
- `resolveUserDestination(userId)` → `{ kind: "redirect", path }` |
  `{ kind: "select-workspace", options }` | `{ kind: "denied", reason }`
  — the single centralized resolver, used by `/login`, `/select-workspace`,
  and `/team/reset-password`
- `requireRole(allowedRoles)` / `requireAdmin()` — the generic server-side
  gate, called from every protected page/layout/action; redirects to
  `/login` (no session) or `/login?error=no-access` (session exists, role
  doesn't match)

## 12. Protected routes and allowed roles

| Route | Allowed roles | Enforced in |
|---|---|---|
| `/admin/**` | `admin`, `super_admin` | every page (8) + every server action (5 files, all exported functions) |
| `/live/**` | `broadcast_operator`, `admin`, `super_admin` | layout + index page + every server action (8 functions) |
| `/team/<token>/**` | `coach` (assignment) or legacy `coach_email` match, scoped to that exact team | `lib/coach-auth.ts` `requireCoach()`, unchanged call sites |
| `/competition` | `competition_manager`, `admin`, `super_admin` | page |
| `/referee` | `referee`, `admin`, `super_admin` | page |
| `/media` | `media`, `admin`, `super_admin` | page |
| `/select-workspace` | any authenticated user with >1 active assignment | page (redirects away otherwise) |

Middleware (`middleware.ts`) verifies session presence only for all of the
above, per the brief's explicit instruction; the table above is where the
actual role is checked.

## 13. Coach assignment behavior

One active assignment → `resolveUserDestination` returns `{ kind:
"redirect", path: "/team/<token>/dashboard" }` — resolved via a real
lookup of that assignment's `team_id` to the team's token, not a
hardcoded path.

## 14. Multiple-workspace behavior

More than one active assignment (any mix of roles, not just multiple
teams) → `{ kind: "select-workspace", options }`. `/select-workspace`
renders only `options` — each built server-side from the user's own
`user_access_assignments` rows, never a full list of teams/roles. Selecting
one submits only an `assignmentId`; `selectWorkspace()` re-fetches that
user's assignments fresh and verifies the chosen id is actually theirs
before resolving a destination — the client never supplies a role or path
directly.

## 15. Remaining placeholders

- `/competition`, `/referee`, `/media` are intentionally minimal — role,
  status, and a "coming soon" message only, per the brief's explicit scope
  limit.
- No admin-facing user-management UI was built (explicitly excluded this
  sprint) — assignments are managed via direct SQL for now; the schema
  supports the full future workflow the brief describes (invite, assign
  role/competition/team, activate/suspend/revoke) without redesign.
- No audit-logging table/events were added — no existing audit structure
  was found to extend, and the brief makes this conditional ("only
  implement... if an existing safe audit structure already exists").
- "Remember Me" was not added — no existing session-duration
  configuration pattern to build on, and the brief explicitly forbids a
  non-functional checkbox.

## 16. Technical risks / schema assumptions

- **Deployment ordering is critical.** The migration's admin-bootstrap
  step is a manual SQL statement (I have no access to any real Supabase
  project to run it automatically). If this sprint's code ships before
  that bootstrap runs, the actual administrator will be locked out of
  `/admin` — flagged prominently in the migration file and
  `DEPLOYMENT_CHECKLIST.md`.
- **The coach `coach_email` fallback is intentionally temporary.** It's a
  safety net for teams invited between "the backfill migration runs" and
  "this code deploys," or for any real production data this sandbox can't
  see. A future sprint should confirm all teams have real assignment rows
  (a simple query) and then remove the fallback branch from
  `lib/coach-auth.ts` and the coach login action.
- **`user_access_assignments` has no `organization_id`/`season_id`
  column** — this platform has no organizations/seasons tables yet.
  Documented in the migration as a deliberate simplification; adding those
  scopes later is a column addition, not a redesign.
- **Assignments are read with the service-role client, not enforced by
  RLS.** This matches the rest of the app but means a bug in
  `lib/access.ts` itself (not a database misconfiguration) is the main
  remaining attack surface — worth a focused code review of that one file
  specifically before this goes to production with real stakes.

## 17. Build result

No network access in this sandbox, so a live `npm install && npm run
build` isn't possible here (same caveat as every prior sprint's delivery).
The `.github/workflows/ci.yml` workflow from an earlier sprint will run
the authoritative build on next push.

## 18. TypeScript-check result

Not run against real `@supabase/ssr`/`@supabase/supabase-js` types in this
sandbox (no network to install them). Every new/modified file was reviewed
for obvious type errors by hand; no `any` was introduced anywhere in this
sprint's new code (checked with `grep`).

## 19. Lint result

Not run (no network to install `eslint-config-next` fresh in this
sandbox) — will run as part of the CI workflow.

## 20. Confirmation: Admin authentication remains functional

`app/admin/login/actions.ts`'s `login()` function — the actual
`signInWithPassword` call and its redirect to `/admin/dashboard` — was
**not modified**. Only a forgot-password link was added to the page
around it. Existing admin sessions continue to work exactly as before;
what's new is that `/admin/dashboard` (and every other admin page/action)
now also checks that the signed-in user actually holds an `admin` role,
which is the fix, not a regression.

## 21. Confirmation: users cannot self-select unauthorized roles

No role value is ever accepted from a form field, query parameter, or
client-side value anywhere in this sprint's code. Every redirect decision
in `resolveUserDestination` and every gate in `requireRole` reads
`role_key` from `user_access_assignments`, fetched with the service-role
client. `/select-workspace`'s form only submits an `assignmentId`, which
is re-validated against that user's own assignments server-side before
any redirect happens.

## 22. Confirmation: coaches cannot access unassigned teams

Unchanged in principle from Sprint 1, now backed by a real table instead
of only a text-column match: `requireCoach(token)` checks that the current
session's user has an active `coach` assignment for *that exact team_id*
(or, as a fallback, that their email matches that team's `coach_email`) —
checked fresh on every request to every protected coach page. A coach
with a valid session for Team A gets redirected away (`?error=forbidden`)
the moment they load Team B's dashboard URL, exactly as before.

## 23. Confirmation: Supabase service-role credentials were not exposed

`lib/access.ts` uses `supabaseAdmin()` (the existing service-role client,
`lib/supabase-admin.ts`, marked `import "server-only"`) exclusively from
server-only modules — every file that imports it is a Server Component,
Server Action, or a `lib/` module itself marked `server-only`. No new
client-side Supabase client was created; `NEXT_PUBLIC_SUPABASE_ANON_KEY`
(already public, already used for auth-only operations) is the only key
this sprint's client-facing code ever touches.
