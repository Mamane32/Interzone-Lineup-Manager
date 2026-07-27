# Sprint 2 — Broadcast Control Center (Live Center)

Architecture explanation and changelog, as requested in the brief's
deliverables list.

## Constraint check

- **Coach Portal**: not broken. `app/team/[token]/actions.ts`
  (`submitLineup`) and `lib/coach-auth.ts` are byte-for-byte unchanged —
  confirmed with `git diff --stat`, both show zero changes.
- **Database structure**: modified, but additively and only where the brief
  judged it "absolutely necessary." See below.
- **No features removed.**
- **No vMix communication implemented** — the Broadcast Panel is a status
  display only (see "What's a placeholder" below); the API route is
  scaffolding, not a working integration.

## Why the schema changed (and why only this much)

Sprint 1 was explicitly schema-frozen. Sprint 2's brief loosens that to
*"unless absolutely necessary"* — and a broadcast control room that resets
to zero on every page refresh isn't a control room. Three things are
genuinely stateful and need to persist:

1. **Match status** (Pre Match → ... → Full Time) — an operator needs this
   to survive a refresh or a second browser tab.
2. **Score** — "Manual Score Edit" is an explicit requirement, which only
   makes sense if the score is a real, directly-editable field rather than
   something purely computed by counting timeline events every time.
3. **The timeline itself** — Highlights Index and Match Report both read
   from it; without persistence there's nothing for them to show.

So `supabase/migrations/002_live_center.sql` (run *after* the original
`schema.sql`) adds, additively:

- `matches.live_status` (new enum, defaults to `pre_match`)
- `matches.home_score`, `matches.away_score` (default `0`)
- `matches.venue`, `matches.referee_name` (nullable — see below)
- a new `match_events` table (the timeline)

Every new column has a safe default or is nullable. Nothing existing was
renamed, retyped, or dropped. The Coach Portal never reads any of these new
columns/table, so it's unaffected whether or not this migration has been
run — though obviously the Live Center itself needs it.

**`venue` supersedes a Sprint 1 placeholder, on purpose.** Sprint 1's
Coach Portal shows "Teren `<Home Team>`" when no real venue is known
(documented in `SPRINT_1_COACH_PORTAL.md`). Now that operators can enter a
real venue from the Live Center match header, the Coach Portal (landing
page, dashboard, calendar, match cards) prefers `match.venue` when set and
falls back to the exact same placeholder when it isn't — existing matches
with `venue = null` render identically to before.

## What's real vs. what's a placeholder

Real (persists to the database, drives the UI):
- Match status transitions, score (goal-tracked and manually editable),
  the full event timeline, venue/referee.
- Team Panels (Starting XI, Bench, Coach, Captain, Goalkeeper) — this
  reuses Sprint 1's `lineups`/`players` data directly. No new table needed;
  the Live Center is just another reader of data the Coach Portal already
  collects. "Goalkeeper" uses the same starting-slot-#1 convention
  established in Sprint 1.
- Highlights Index — derived by filtering the real timeline for
  goal/red-card/VAR-type events; "Winning Goal" is computed (the last goal
  by whichever team is ahead once status = Full Time), not a stored flag.

Explicit placeholders (per the brief — "may use placeholder values",
"No implementation required yet"):
- **Statistics Panel** — static numbers (`components/live/StatisticsPanel.tsx`).
  No stats table, no feed. Swapping in real data later only means replacing
  that one array with a fetched one.
- **Broadcast Panel** — vMix / Website / Graphics / Replay / Highlights /
  UTC all show "Disconnected." No connections exist. The status vocabulary
  (Connected/Disconnected/Pending) is wired into the UI so a real
  integration later doesn't need a redesign, just a real status source.
- **Formation** — no field exists for it (Sprint 1 explicitly has no
  player-position data); shown as "—".
- **Weather, Season, Attendance, Export** — static placeholders exactly as
  named in the brief.

## API placeholder

`app/api/live/[matchId]/route.ts` — a read-only `GET` returning current
status/score/events as JSON. This is the shape a future vMix overlay or
website embed would consume. It is **not authenticated** — there's a
comment in the file making that explicit. Don't point real broadcast
infrastructure at it before adding an API key or signed token; it exists
so the contract shape is settled, not as a production endpoint.

## Routing and auth

The Live Center lives at `/live/...`, a new top-level route — not nested
under `/admin` — specifically so it gets its own visual identity (dark
broadcast-room UI, no admin nav chrome) without fighting Next.js layout
nesting. It reuses the exact same single-administrator Supabase Auth
session as `/admin`: `middleware.ts` now treats `/admin/*` and `/live/*`
identically for auth purposes (there's no separate "broadcast operator"
role in this system). Two small, additive discoverability links were
added: a "Live Center" item in the admin nav, and a "Live Center" button
on each match row in Admin → Matches. Nothing else in `/admin` changed.

```
/live                          Match picker (index)
/live/[matchId]                 Main control room
/live/[matchId]/report          Match Report
/api/live/[matchId]             Read-only JSON placeholder (unauthenticated)
```

## Layout, per the brief's "Main Layout" spec

`app/live/[matchId]/page.tsx` assembles:
- **Match Header** (`MatchHeaderPanel`) — full width, top.
- **Left Control Panel** — `StatusControls` (8 stage buttons) +
  `ScoreControl` (goal buttons with confirmation dialog, undo, manual
  edit) + `EventControls` (the full 11-type event grid, each opening a
  minute/team/player dialog).
- **Center Live Match Area** — tabbed (`CenterTabs`): Statistics / Teams /
  Broadcast / Highlights.
- **Right Timeline** — `Timeline`, filterable (All/Goals/Cards/Subs/Other),
  with per-event delete (this doubles as "Undo Goal" for any goal-type
  event, not just the most recent one).
- **Bottom Quick Controls** — `QuickControlsBar`, a sticky bar with the two
  fastest actions (quick goal add per team, advance to next status).

Responsive: the 3-column grid collapses to a single column below `lg`, so
panels stack top-to-bottom on tablet.

## New files

`supabase/migrations/002_live_center.sql` ·
`lib/live-match.ts` ·
`app/live/page.tsx` ·
`app/live/[matchId]/{layout.tsx,page.tsx,actions.ts}` ·
`app/live/[matchId]/report/page.tsx` ·
`app/api/live/[matchId]/route.ts` ·
`components/live/{MatchHeaderPanel,StatusControls,ScoreControl,EventControls,Timeline,StatisticsPanel,TeamPanels,BroadcastPanel,HighlightsIndex,QuickControlsBar,CenterTabs,Modal}.tsx`

## Modified files

`lib/types.ts` (new Live Center types; `Match` gained optional Sprint 2
fields) · `middleware.ts` (auth now also covers `/live/*`) ·
`app/admin/layout.tsx`, `app/admin/matches/page.tsx` (one nav link, one
button — additive) · `app/team/[token]/page.tsx`,
`app/team/[token]/(coach)/dashboard/page.tsx`,
`app/team/[token]/(coach)/calendar/page.tsx`,
`components/coach/MatchListItem.tsx` (venue placeholder now prefers the
real `venue` field when set).

## Untouched (confirmed)

`supabase/schema.sql`, `app/team/[token]/actions.ts`, `lib/coach-auth.ts`,
every other Coach Portal file, all Competitions/Teams/Lineups/Settings
admin pages.

## Not built (per explicit scope)

Referee Portal, Public Website, Media Partner Portal, real vMix
communication, automatic highlight generation. Also not built: backend
automation of match-status transitions (e.g. auto-advancing to Full Time)
— every status change in this sprint is a manual button press, as
specified.
