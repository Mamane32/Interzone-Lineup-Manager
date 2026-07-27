# Sprint 1 — Coach Portal Redesign

This document explains what changed, why, and the handful of judgment calls
made to satisfy the brief's constraints (no schema changes, no new tables,
existing lineup logic untouched) while still delivering real authentication
and a premium multi-page experience.

## Constraint check

- **Database schema**: unchanged. No new tables, no new columns. Verify
  with `git diff` against `supabase/schema.sql` — it's untouched.
- **Lineup submission logic**: unchanged. `app/team/[token]/actions.ts`
  (`submitLineup`) was not modified — same validation, same fields, same
  Supabase writes.
- **Existing APIs / data fetching**: unchanged in substance. The lineup
  page's data-fetching query is the same one that used to live directly at
  `/team/[token]`; it just moved to `/team/[token]/lineup` and gained an
  optional `?match=` parameter (used by the Calendar) that falls back to
  the exact original "active lineup" selection logic when absent.

## How coach login works without a schema change

The brief requires real email/password authentication where "Coach A can
never access Coach B's data" — but forbids adding tables or columns. The
`teams` table already had a `coach_email` field (previously just a contact
detail). This sprint repurposes it as the login identity:

1. **Supabase Auth** (already used for the admin) now also holds coach
   accounts — no separate user table needed, it's Supabase's built-in
   `auth.users`.
2. Every protected coach page calls `requireCoach(token)`
   (`lib/coach-auth.ts`), which checks that the **logged-in user's email**
   matches **that team's `coach_email`**. If it doesn't match — including a
   valid login for a *different* team — it redirects to that team's login,
   never the data.
3. Admins provision a coach's login from the existing Team detail page
   (`app/admin/teams/[id]/page.tsx`) with a new **"Send coach login
   invite"** button. This calls Supabase Auth's built-in
   `auth.admin.inviteUserByEmail()` — again, no new table — which emails
   the coach a link to set their password.
4. Because `coach_email` is now the login identity, it's required going
   forward (form validation only — the database column itself is
   unchanged and still nullable, so this is not a schema change).

**One consequence worth knowing:** since row-level security is still
locked down with no public policies (per the original design), coach pages
continue reading data through the service-role client, same as before —
the email-match check above is what stands in for per-coach RLS.

## Architecture prepared for Phone + Password

The login form and `requireCoach()` check are keyed on `coach_email` /
Supabase Auth's `user.email`, not hardcoded to "email flow only." Adding
phone auth later means adding a Supabase phone provider and a second field
on the login form — no changes needed to `lib/coach-auth.ts` or the
ownership-check logic.

## Schema-safe substitutions

Two pieces of the brief describe data the current schema doesn't have. No
tables were added; instead:

- **Venue**: `matches` has no venue column. The landing page and calendar
  show "Teren `<Home Team Name>`" (i.e. "at [home team]'s ground"), derived
  from the existing home/away relationship — a common grassroots-football
  convention. If a real venue field is wanted later, that's a one-column
  migration for a future sprint.
- **Goalkeeper badge**: `players` has no position field (the original spec
  explicitly said "no positions needed for MVP"). The lineup UI badges
  **starting slot #1** as "GK" — the first Titilè dropdown — since that's
  the conventional goalkeeper slot on a simple lineup sheet. It's a display
  convention, not stored data; nothing prevents a coach from putting any
  player there.
- **Competition logo**: `competitions` has no logo column. The landing
  page uses a trophy icon + competition name instead of an image.

## New routes

```
/team/[token]                    Premium landing page (public)
/team/[token]/login               Coach sign-in
/team/[token]/forgot-password     Request a reset email
/team/reset-password              Set new password (from invite or reset email)
/team/[token]/dashboard           Coach dashboard  (protected)
/team/[token]/lineup              The lineup form, moved here (protected)
/team/[token]/calendar            Upcoming + past matches (protected)
/team/[token]/profile             Coach info, change password, logout (protected)
/auth/callback                    Exchanges the emailed invite/recovery code for a session
```

**Important for deployment:** Supabase's invite and password-recovery
emails use the PKCE flow — the link sends a one-time `?code=`, which has to
be exchanged for a real session before `/team/reset-password` can set a
new password. That exchange has to happen in a Route Handler (only Route
Handlers and Server Actions can write cookies; a plain page render can't),
which is what `app/auth/callback/route.ts` is for. Both the "Send coach
login invite" button and the coach's own "forgot password" flow point
their `redirectTo` here first, which then forwards on to
`/team/reset-password`. Make sure `<your domain>/auth/callback` is on
Supabase's **Authentication → URL Configuration → Redirect URLs** allow
list (see `DEPLOYMENT_CHECKLIST.md`), or the emailed links will be
rejected.

`(coach)` is a route group (`app/team/[token]/(coach)/`) providing the
shared header + bottom navigation for the four protected pages — it adds
no URL segment.

## Notifications — UI only, as specified

`components/coach/NotificationsPanel.tsx` renders cards computed from data
already being fetched (next match proximity → 24h/1h reminder cards,
`lineups.status`/`submitted_at` → "Lineup Submitted" card). One "Admin
Message" card is included as a static illustrative example, exactly as
listed in the brief's examples — there is no messaging backend, and none
was added.

## Files touched

**New:**
`lib/coach-auth.ts` ·
`app/auth/callback/route.ts` ·
`app/team/[token]/login/{page.tsx,actions.ts}` ·
`app/team/[token]/forgot-password/{page.tsx,actions.ts}` ·
`app/team/reset-password/{page.tsx,actions.ts}` ·
`app/team/[token]/(coach)/layout.tsx` ·
`app/team/[token]/(coach)/dashboard/page.tsx` ·
`app/team/[token]/(coach)/calendar/page.tsx` ·
`app/team/[token]/(coach)/profile/{page.tsx,actions.ts}` ·
`app/team/[token]/(coach)/lineup/page.tsx` ·
`components/coach/{BottomNav,CountdownTimer,MatchListItem,NotificationsPanel}.tsx`

**Modified:**
`app/team/[token]/page.tsx` (was the lineup page → now the landing page) ·
`app/team/[token]/LineupForm.tsx` (same state/logic, restyled markup, GK/Captain badges) ·
`middleware.ts` (added coach-route protection) ·
`app/admin/teams/page.tsx`, `app/admin/teams/[id]/page.tsx`, `app/admin/teams/[id]/actions.ts`, `app/admin/teams/actions.ts` (coach email now required + invite button) ·
`app/globals.css` (added a shared fade-up entrance animation) ·
`package.json` (added `lucide-react` for icons — frontend-only, no backend impact)

**Unchanged (confirmed):**
`supabase/schema.sql`, `app/team/[token]/actions.ts` (submitLineup), all
Admin Dashboard / Matches / Competitions / Lineups / Settings pages beyond
the two small Teams-page edits above.

## Not built (per explicit scope)

Admin Dashboard changes beyond the one invite button, Referee Portal, Live
Center, Public Website, Media Partner Portal, and any backend notification
scheduling.
