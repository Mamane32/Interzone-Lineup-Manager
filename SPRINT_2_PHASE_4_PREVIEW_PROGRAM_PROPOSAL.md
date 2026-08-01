# GGSP — Preview / Program Architecture Proposal

No implementation in this document — this is the design to review before
Decision 3 of Sprint 2 Phase 4 starts. Grounded in what exists today
(nothing yet — Preview/Program has no code footprint in GGSP), and in
what Decision 2's Graphics Queue proposal already established, since
Program output is defined entirely in terms of that queue's state.

---

## 1. What already exists

| File | Relevance |
|---|---|
| `lib/broadcast/BroadcastSession.ts` | Already lists `graphics`/`animation`/`replay`/etc. as named subsystems with an honest `"planned"` state — Preview/Program isn't even in that list yet. This is genuinely new surface area, not a rename of something half-built. |
| `components/live/formation/FormationAnimationPreview.tsx`, `CoachPresentation` (in `FormationVisualizations.tsx`) | The one precedent for "broadcast-safe rendering" in this codebase — a full-bleed, chrome-free render of what a viewer would actually see on air, already built and already reused across Formation's own Broadcast Preview tab. Program's rendering layer should extend this precedent, not invent a second one. |
| Every live page (`app/live/[matchId]/**`) | `force-dynamic`, read fresh per request, updated by a Server Action's implicit re-render **of the acting operator's own tab only**. Confirmed by grep: no realtime, no polling, no websocket anywhere in this repo. |
| `SPRINT_2_PHASE_4_GRAPHICS_QUEUE_PROPOSAL.md` (Decision 2, proposed, not yet implemented) | Section 5 of that proposal explicitly deferred cross-session live sync as "a separate, larger decision that affects every live page, not just Graphics." **This is that decision.** Program's entire purpose — showing "what's live" on a device that isn't the operator's own control-surface tab — cannot work on the implicit-refresh model at all, unlike Graphics Queue which could ship without it. |

---

## 2. What "Preview" and "Program" mean here

Standard broadcast-console vocabulary, not a GGSP invention:

- **Program (PGM)** — what's actually on air right now. Directly derived
  from Decision 2's `graphics_queue` (the row where `status = 'live'`)
  plus the match's current score/clock — there is no separate "Program
  state" to invent; Program *is* a read model over state that already
  exists once Decision 2 ships.
- **Preview (PVW)** — what's staged to go on air next, so an operator or
  director can visually confirm it before taking it live. Derived from
  `graphics_queue`'s next `status = 'queued'` row per category (or
  whichever queued item the operator has explicitly selected to preview).

Neither is a new domain concept — both are new *views* over Decision 2's
queue. This proposal is about how those views reach a screen that isn't
the operator's own browser tab, reliably, at whatever scale the venue
needs.

---

## 3. The requirement that rules out "just open a second window"

The brief lists four deployment shapes: single monitor, dual monitor,
external display, future production rooms. The first two are the same
physical machine as the operator's console — a popped-out window dragged
to a second monitor. The third and fourth are not: an "external display"
in a real broadcast setup is typically its own appliance or a separate
machine feeding a projector/screen at the venue, and a "future production
room" is by definition a different location entirely, possibly staffed by
different people, watching over the network.

`window.postMessage` between an opener and a child `window.open()`
window, or the `BroadcastChannel` API, are same-device, same-browser-
process mechanisms — every tab/window they can reach shares one browser
on one machine. They work perfectly for "dual monitor" (an operator drags
a popped-out window to their second screen) and not at all for "external
display as a separate appliance" or "future production room" (a
different device, possibly a different network segment, has no process
to receive a same-device message from). Picking either as *the*
architecture would satisfy two of the four required shapes and need
replacing — the exact outcome the brief says to avoid — the day a real
second device shows up.

**Conclusion: the durable architecture is a server-pushed state channel
that any device can subscribe to by opening a URL — not same-device
messaging.** Cross-window messaging still has a real, narrow role (see
Section 5) as a same-device optimization layered on top, not as the
foundation.

---

## 4. Proposed transport: Supabase Realtime

This codebase already runs on Supabase for DB and auth — no new vendor.
Supabase Realtime (a websocket channel broadcasting Postgres row
changes) lets any browser, on any device, anywhere on the network,
subscribe to `graphics_queue` changes for one `match_id` and re-render
the instant an operator takes or hides a graphic. This is the one piece
of infrastructure this proposal actually asks to introduce — Decision 2
deliberately avoided needing it; Decision 3 cannot avoid it, since its
entire job is showing state on a screen with no operator action of its
own to trigger a refresh.

```
┌───────────────────────────────────────────────────────────┐
│ Operator's Control Room tab (existing, unchanged)           │
│   Server Action → writes graphics_queue → Postgres           │
└───────────────────────────────────────────────────────────┘
                              │
                              ▼  (Postgres change feed)
┌───────────────────────────────────────────────────────────┐
│ Supabase Realtime channel: graphics_queue:match_id=eq.<id>   │
└───────────────────────────────────────────────────────────┘
        │                    │                     │
        ▼                    ▼                     ▼
┌───────────────┐   ┌────────────────┐   ┌───────────────────┐
│ Program window │   │ Preview window │   │ Any future room's  │
│ (this device or│   │ (this device or│   │ device, same URL,   │
│ a separate one)│   │ a separate one)│   │ zero new code       │
└───────────────┘   └────────────────┘   └───────────────────┘
```

Every subscriber is just a browser pointed at a plain URL — that's what
makes "future production rooms" free: it needs no bespoke pairing step,
no operator action to "connect a new display," just opening
`/live/[matchId]/program` (or `/preview`) on whatever device is there.

---

## 5. Where cross-window messaging still belongs

For the single-device, dual-monitor case specifically, a same-device
`BroadcastChannel` (not `postMessage` — it doesn't require an
opener/child reference, so it survives the operator closing and
reopening the popped-out window) gives a popped-out Program window a
zero-latency, zero-network-hop update path in addition to its Realtime
subscription. This is purely an optimization: the Realtime subscription
is what makes the window correct and scalable; `BroadcastChannel` is what
makes it feel instantaneous when the source and the display happen to
share a machine. A Program window with no same-device peer (the external-
display and production-room cases) simply never receives a
`BroadcastChannel` message and relies on Realtime alone — same code path,
no branching required.

---

## 6. Proposed pages

```
app/live/[matchId]/program/page.tsx   (NEW)
app/live/[matchId]/preview/page.tsx   (NEW)
```

Both: full-bleed, no `BroadcastHeader` chrome, no nav — these are output
surfaces meant to be captured by a vision mixer or shown directly to an
audience/venue screen, not operated from. Both render through the same
broadcast-safe presentation layer `FormationAnimationPreview`/
`CoachPresentation` already established (extended to show live match
graphics generically, not just formation, since Program needs to display
whichever graphic is actually live — scoreboard, lower third, formation,
etc. — not only the formation case those components handle today).

Gated the same way every other `/live/[matchId]/**` route already is
(`requireRole(["broadcast_operator","admin","super_admin"])`) — these are
still internal production surfaces, not public pages, even though
they're meant to be pointed at a projector rather than clicked through by
an operator.

---

## 7. What does not change

- Decision 2's `graphics_queue` schema and service — Program/Preview are
  read-only consumers of it, adding no new write path.
- The operator's own Control Room UI and its implicit-refresh model —
  unaffected; the operator's tab still updates the same way it does
  today after a Server Action.
- `lib/broadcast/GraphicsEngine.ts`/`BroadcastEngine`/`VMixEngine` — this
  proposal is entirely about what a human sees on a screen, not about
  what gets sent to vMix; the two are complementary, not overlapping.

---

## Decisions needed before implementation starts

1. **Confirm Supabase Realtime is acceptable to introduce.** It's the
   first websocket/push mechanism in this codebase — a genuine new
   dependency in practice (enabling replication on `graphics_queue`,
   a client-side subscription library) even though it uses the existing
   Supabase project, not a new vendor.
2. **Scope of what Program/Preview render at launch.** Decision 2's
   Graphics Queue covers the fixed catalog (`Scoreboard`, `Lower Third`,
   `Goal`, `Formation`, etc.). Confirm Program/Preview only need to
   render whichever of those is live/next — not, at this stage, a fully
   custom-composited broadcast frame — since a true compositor is a much
   larger scope than "where does the current graphic show up."
3. **Whether `/program` and `/preview` need to be separately linkable/
   shareable** (e.g. a URL an external display operator pastes in
   directly) or should only ever be reached by a "pop out" button from
   inside the Control Room — affects whether they need their own nav
   entry point or stay intentionally unlisted.
