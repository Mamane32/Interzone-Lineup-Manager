# Sprint 1 — UI Polish (post-review)

Response to the Sprint 1 review. Per the review's conclusion — "no
architecture changes required" — this pass touched **styling and markup
only**. Confirmed with `git diff --stat` against `supabase/schema.sql`,
`app/team/[token]/actions.ts` (lineup submission), `lib/coach-auth.ts`, and
`middleware.ts`: all four are untouched by this pass.

## The one new mechanism: dynamic team theming, without a schema change

The review's biggest ask — "Jean Rabel FC should not visually look
identical to Bombardopolis FC" — needs a per-team color identity. There's
no `color` or `banner_url` column, and this pass doesn't add one. Instead,
`lib/team-theme.ts` deterministically derives a theme (gradient, ring,
chip colors) from a team's existing `id`/`name` — same team always renders
in the same colors, automatically, for every team without any admin
action. It's applied to: the dashboard hero, match cards, the persistent
header, the login page, and the landing page.

If real admin-chosen brand colors are wanted later, that's a one-column
migration for a future sprint — not needed for this one.

## Review items → what changed

**1. Premium Dashboard Design** — Rebuilt the hero into a large match card
(team vs. opponent logos, "VS", themed gradient background, competition
banner strip, bigger countdown, venue line) instead of the previous
compact info block. Quick actions and the upcoming list got staggered
entrance animation.

**2. Dynamic Team Branding** — `lib/team-theme.ts` (above), applied across
every coach-facing screen: landing, login, header, dashboard hero, match
cards.

**3. Redesigned Match Cards** — `components/coach/MatchListItem.tsx`
rebuilt with: opponent logo, themed date block, competition label, time
with icon, venue with icon, status badge — used on both the Dashboard and
Calendar so they're visually consistent.

**4. Better Notification Design** — `components/coach/NotificationsPanel.tsx`
now has a per-type icon + color map. Every type from the review's examples
is styled — including `goal`, `yellow_card`, `red_card` — but only
`scheduled`, `reminder24`, `reminder1`, `submitted`, and `announcement` are
ever actually emitted, because match-event data (goals, cards) doesn't
exist in this app; that's the Broadcast Control Center / Live Center
mentioned as the next phase. The styling is ready for it; no fake data was
added.

**5. Improved Calendar UI** — Matches now group by month with header
labels, using the same premium match cards as the dashboard, rather than a
flat list.

**6. More Animations** — Added to `app/globals.css`:
`animate-fade-up` (now stagger-aware via a `--stagger` CSS variable),
`animate-slide-in` (notifications panel), `animate-success-pop` (lineup
confirmation banner). Added `active:scale-95` micro-interaction to the
shared `Button` component (used everywhere, admin included) and to quick
action / match cards. Added real Next.js loading states
(`loading.tsx` + `components/coach/Skeleton.tsx`) for the dashboard,
calendar, lineup, and profile routes — actual route-level Suspense
skeletons, not a simulated spinner.

## Files touched

**New:** `lib/team-theme.ts`, `components/coach/Skeleton.tsx`, four
`loading.tsx` files (dashboard, calendar, lineup, profile).

**Modified:** `app/team/[token]/(coach)/dashboard/page.tsx`,
`app/team/[token]/(coach)/calendar/page.tsx`,
`app/team/[token]/(coach)/layout.tsx`, `app/team/[token]/page.tsx`
(landing), `app/team/[token]/login/page.tsx`,
`app/team/[token]/LineupForm.tsx` (success banner animation only —
submission logic itself untouched), `components/coach/MatchListItem.tsx`,
`components/coach/NotificationsPanel.tsx`, `components/ui/Button.tsx`,
`app/globals.css`.

**Untouched (confirmed):** `supabase/schema.sql`,
`app/team/[token]/actions.ts`, `lib/coach-auth.ts`, `middleware.ts`, the
entire Admin module, all Server Actions.
