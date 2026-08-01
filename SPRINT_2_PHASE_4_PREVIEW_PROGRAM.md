# GGSP — Preview / Program Output

Implements Decision 3, per
[SPRINT_2_PHASE_4_PREVIEW_PROGRAM_PROPOSAL.md](SPRINT_2_PHASE_4_PREVIEW_PROGRAM_PROPOSAL.md),
with one transport change made during implementation — explained below —
from what that proposal recommended.

## 1. What was built

- **`app/broadcast-output/[matchId]/program/page.tsx`** and
  **`.../preview/page.tsx`** (NEW) — full-bleed output surfaces, gated by
  the same `requireRole(["broadcast_operator","admin","super_admin"])`
  every other Broadcast Control Center route uses. Deliberately a
  **separate top-level route**, not nested under `/live/[matchId]/**` —
  that segment's own `layout.tsx` always renders `BroadcastHeader`'s
  operator chrome for every route beneath it, and Program/Preview must be
  chrome-free (meant for a vision mixer or a venue screen, not an
  operator).
- **`components/broadcast-output/ProductionOutputFrame.tsx`** (NEW) —
  the shared rendering for both: a category/name "on air" slate for
  whichever `production_queue` item is live (Program) or next queued
  (Preview), plus an always-on score bug underneath. Deliberately not a
  full graphics compositor — there's no per-graphic-type visual template
  (scoreboard vs. lower third vs. starting lineup) to render yet; showing
  *which* item is live/next is what Decision 2's queue actually makes
  possible today, not a rendered broadcast frame.
- **`app/api/live/[matchId]/production-queue/route.ts`** (NEW) — what
  Program/Preview poll, every 4 seconds, for fresh queue state.
- Two small "Program"/"Preview" pop-out links added to
  `BroadcastHeader.tsx`, opening each in a new tab — the "single monitor"
  (view in a tab) and "dual monitor" (drag that tab to a second screen)
  cases the decision asks for, with zero pairing step.

## 2. Transport: polling, not Supabase Realtime — a deliberate change from the approved proposal

The proposal recommended Supabase Realtime as the durable, any-device
transport, and flagged introducing it as an open decision needing
confirmation. Implementing it surfaced something the proposal didn't
fully weigh: **every table in this project has RLS enabled with zero
public policies** — confirmed by grepping the entire migration history
for `create policy` (zero matches). All access goes through the
service-role client, never the browser. A client-side Realtime
subscription needs the browser to hold an authenticated/anon key
Supabase respects for that table — meaning Realtime would require this
project's **first-ever RLS policy**, a real security-boundary change, not
a transport detail.

Rather than make that call unilaterally mid-implementation, or stall
Decision 3 waiting on a decision that's really a separate policy
question, `app/api/live/[matchId]/production-queue/route.ts` reuses the
exact auth pattern `app/api/live/[matchId]/route.ts` already established
(cookie session → `user_access_assignments` role check → service-role
read → plain JSON) — zero new security surface, same pattern already
proven in this codebase. `ProductionOutputFrame` polls that route every
4 seconds. This satisfies every literal requirement in Decision 3 (any
device, anywhere, opens a URL and gets updates — no pairing, no
per-display setup) with a few seconds of latency instead of instant push.

This is not a dead end: `ProductionOutputFrame`'s data-fetching is
already isolated to one `useEffect` polling loop. Upgrading to Realtime
later — once the RLS-policy question is answered on its own — is a
one-file change to that hook, not a rewrite of either output page.

## 3. Quality gate

No schema changes in this task (the polling route reads
`production_queue`, added in Task 67/68 — no migration needed here).
`npm run typecheck`, `npm run lint`, `npm run test` (129 tests, 13
files — 2 new: the polling route's auth test and a gate test covering
both output pages), and `npm run build` all pass clean. Both new routes
compile and are listed in the build output
(`/broadcast-output/[matchId]/program`, `/broadcast-output/[matchId]/preview`,
`/api/live/[matchId]/production-queue`).

## Not yet done

- No per-graphic-type visual template (a real "Scoreboard" or "Lower
  Third" render) — Program/Preview show which item is live/next, not a
  composited frame. Building real templates is a distinct, larger effort.
- Realtime push transport remains the recommended long-term upgrade, held
  pending an explicit decision on introducing this project's first RLS
  policy — a security-boundary question, not a Preview/Program detail.
