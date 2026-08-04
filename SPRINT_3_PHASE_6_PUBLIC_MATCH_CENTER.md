# GGSP — Sprint 3, Phase 6: Public Match Center

Implements the confirmed decision: a real, unauthenticated public match
page, supporting every match state, built as the deliberate starting
point for the future full GoodGrafik website rather than a one-off page
(folding Phase 7 — Website Synchronization — into this phase, per the
confirmed decision that the Public Match Center *is* that beginning, not
a second architecture next to it).

## Data layer — `lib/public-match.ts`

One function, `getPublicMatchView(matchId)`, is the entire public read
surface. It is the reusable seam the decision asked for: a future full
website (or a public API route) calls this same function rather than a
second, parallel public data layer being built later.

The function returns a deliberately shaped DTO, not raw table rows —
every field has already been decided safe to show an anonymous visitor.
Concretely excluded by construction (never selected from the database at
all, not just hidden in the UI): `teams.coach_phone`, `teams.coach_email`,
`teams.token` (the Coach Portal's own private access token), and
anything from `lineups`/`tactical_formations` (the Formation Engine has
been Broadcast-Control-Center-only since Sprint 2 and stays that way —
this page doesn't touch those tables at all).

`phase` (`"upcoming" | "live" | "finished"`) is derived from
`live_status` and drives what the page renders — reuses
`lib/match-clock.ts`'s `deriveMatchClock` directly rather than
re-deriving the minute/clock display logic a second time.

## Route — `app/match/[matchId]/page.tsx`

A new top-level route, deliberately outside `/live/[matchId]/**` (which
stays exactly as gated as it's always been). No `requireRole`/
`requireCoach` call — reads happen through the service-role client inside
a Server Component, so the anonymous visitor's browser never touches
Supabase directly and never receives service-role credentials; the only
thing that reaches the browser is whatever HTML this page renders from
the already-scrubbed `PublicMatchView`. Confirmed in `middleware.ts`:
`/match` isn't in `SESSION_ONLY_PROTECTED_PREFIXES` and isn't even in the
middleware's `matcher` config, so the middleware doesn't run for this
route at all — genuinely public at the routing layer, not just
unenforced.

**Deliberately does not reuse `StatisticsPanel`/`MatchTimelineEvent`** —
both are "use client" components whose props are full private `Team`/
`MatchEvent` objects (carrying `coach_phone`, `token`, etc.) that would
be serialized into the public page's client bundle even if never
rendered on screen, which is a real leak, not a style concern. The page
builds its own small read-only presentation instead, reusing only what's
genuinely safe: `EVENT_META` (plain icons/labels, no private data) and
`getTheme` (pure function). This is the one deliberate exception to
"reuse every shared component" this phase makes, and it's a security
boundary, not a shortcut.

Content varies by `phase`:
- **Upcoming**: teams, kickoff date/time, competition/venue/referee —
  no score, no timeline, no stats (there's nothing to show yet).
- **Live** (kickoff/first_half/half_time/second_half/extra_time/
  penalty_shootout) and **Finished**: adds the live/final score and
  clock, the full match timeline, and match statistics.

## Verified in the browser

Both real matches in the database (both currently `pre_match`) render
correctly: real team logos, real competition name ("Interzone 2026" —
confirming that name is already the live data, not something this phase
needed to set), the real referee name where set, correctly omitting venue/
referee chips where unset, no console errors, no private fields
anywhere in the rendered output or page source. The live/finished-phase
rendering path (timeline + statistics) reuses logic already visually
verified in the Broadcast Control Room (Phases 1–5) rather than needing
a live match in the seed data to re-prove.

## Quality gate

No schema changes this phase (reuses `matches`/`match_events`/
`match_statistics`/`teams`/`venues`/`competitions`/`organizations` as
they already exist) — no migration needed. `npm run typecheck`,
`npm run lint`, `npm run test` (129 tests, 13 files), and `npm run build`
all pass clean.
