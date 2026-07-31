# GGSP — Formation Engine Architecture Proposal

No implementation in this document — this is the design to review before
Phase 2 starts. Grounded in what exists today, not a clean-slate redesign.

---

## 1. What already exists

The Tactical Formation Panel (Sprint 1) already contains most of a real
engine, just not separated out as one yet:

| File | What it actually is today |
|---|---|
| `lib/formations.ts` | Pure data: 9 formation templates as percentage coordinates, `PlacedPlayer` type. No DB, no auth, no framework dependency. **Already engine-shaped.** |
| `lib/tactical-formation.ts` | Server-only read access (`getTacticalFormation`). No role check of its own — trusts its caller. |
| `app/live/[matchId]/formation/actions.ts` | The **only** write path (`saveFormation`). Contains three different concerns bolted together: the role gate (`requireRole(["broadcast_operator","admin","super_admin"])`), business validation (exactly one goalkeeper, at most one captain, team belongs to match), and the actual persistence (upsert formation, replace positions). |
| `components/live/formation/PlayerToken.tsx`, `PitchMarkings.tsx` | Pure presentational components — props in, nothing else. **Already reusable as-is.** |
| `components/live/formation/TacticalFormationBoard.tsx` | The orchestrator: owns drag state, and **imports `saveFormation` directly** from the admin/broadcast action file. |
| `supabase/migrations/007_tactical_formations.sql` | `tactical_formations` (one row per match+team) / `tactical_positions`. Frozen schema, no per-role concept in it at all — it doesn't know or care who saved a row. |
| `tests/security/action-gates.test.ts` | Currently asserts the Coach Portal **never** references `tactical-formation` or `formation/actions` — written when this was single-purpose, admin/broadcast-only. |

**The one real coupling problem:** `TacticalFormationBoard` imports the
admin/broadcast Server Action directly. That's exactly why the Coach
Portal can't use this board today without violating the existing
exclusion test — the board isn't just rendering, it's wired to one role's
permission boundary. Everything below exists to fix that specific
coupling, not to rewrite what already works.

---

## 2. Proposed layering

```
┌─────────────────────────────────────────────────────────────────┐
│ RENDERING LAYER (client, "dumb", no Server Action imports)        │
│   PitchMarkings, PlayerToken, TacticalFormationBoard              │
│   — reusable verbatim by Coach / Admin / Broadcast / Live Center  │
│   — takes an onSave callback prop; never imports an action itself│
└─────────────────────────────────────────────────────────────────┘
                              ▲ composes
┌─────────────────────────────────────────────────────────────────┐
│ ROLE SHELLS (client, one per experience)                         │
│   CoachFormationEditor · AdminFormationReview ·                  │
│   BroadcastFormationComposer (today's Visualizations/Animation/  │
│   vMix Export tabs live here — broadcast-specific chrome, not    │
│   engine logic)                                                  │
└─────────────────────────────────────────────────────────────────┘
                              ▲ calls
┌─────────────────────────────────────────────────────────────────┐
│ PERMISSION BOUNDARY (server, one thin action per role)           │
│   app/live/[matchId]/formation/actions.ts   (admin/broadcast)     │
│   app/team/[token]/(coach)/.../actions.ts   (coach — NEW)         │
│   Each: requireX() → scope check → call the shared core          │
└─────────────────────────────────────────────────────────────────┘
                              ▲ calls
┌─────────────────────────────────────────────────────────────────┐
│ ENGINE (server-only, role-agnostic, pure business rules)          │
│   lib/formations.ts        (already this — templates, geometry)  │
│   lib/formation-engine.ts  (NEW — validation, extracted from the │
│                             current saveFormation)                │
│   lib/tactical-formation.ts (already this — read access)          │
└─────────────────────────────────────────────────────────────────┘
                              ▲ reads/writes
┌─────────────────────────────────────────────────────────────────┐
│ DATABASE — tactical_formations / tactical_positions (UNCHANGED)  │
│   Owned by the engine, not by any role. One row set per          │
│   (match, team) regardless of who saved it.                      │
└─────────────────────────────────────────────────────────────────┘
```

## 3. Separation between engine and UI

The engine layer knows nothing about React, routes, or roles. It answers
exactly one question: **"is this formation data valid, and how do I
persist it?"** — not "who is allowed to call this." Concretely:

- `lib/formation-engine.ts` (new) would hold the validation currently
  inline in `saveFormation`: exactly one goalkeeper, at most one captain,
  every position references a real roster player, coordinates in range.
  Pure functions — no `supabaseAdmin()`, no `requireRole()`. Unit-testable
  with plain objects, no mocking a request/session.
- The persistence half (upsert `tactical_formations`, replace
  `tactical_positions`) becomes a shared `saveFormationCore()` — still
  server-only, still no role check, called only by the permission-boundary
  actions above it, never directly by UI.
- Nothing in the engine changes based on which role is calling it. A
  Coach's save and an Admin's save run through the identical validation and
  the identical write path — the *only* difference is which action
  function was allowed to call it, and what team/match scope it was
  called with.

This is what makes "one engine, multiple role-specific experiences"
concrete rather than a slogan: the engine has exactly one implementation
of "what does a valid formation look like," so a validation rule fixed or
changed later is fixed once, not once per role — the same lesson Sprint 1
already learned the hard way with the `revalidatePath` duplication.

## 4. The reusable rendering layer

`PitchMarkings` and `PlayerToken` need no changes — they're already pure.
`TacticalFormationBoard` needs exactly one change: stop importing
`saveFormation` directly, and instead accept it as a prop:

```
onSave: (formation, positions) => Promise<SaveFormationResult>
```

Each role's shell passes in its *own* permission-boundary action. The
board itself never knows or cares whether it's being driven by a coach
editing their own team or an admin reviewing both. A `readOnly` flag
(disabling `PlayerToken`'s drag handlers) is what lets Broadcast's
read-only mode and Live Center's display-only mode reuse the exact same
component tree instead of a second, parallel "view-only pitch" being
built.

Broadcast-specific presentation modes that already exist —
`FormationVisualizations`, `FormationAnimationPreview`, `VMixExportPreview`
— stay exactly where they are, as Broadcast's own shell composing the
shared board plus its own extra tabs. They are consumers of the shared
`PlacedPlayer[]` shape, not part of the engine.

## 5. Validation responsibilities — three distinct tiers

| Tier | Owns | Example | Where |
|---|---|---|---|
| **Engine** | Is the *data* valid, regardless of who submitted it | Exactly one GK, ≤1 captain, positions reference real roster players | `lib/formation-engine.ts` |
| **Permission boundary** | Is *this actor* allowed to do *this*, to *this* team/match | Coach may only save their own team; Admin/Broadcast may save either team in the match they're viewing | Each role's thin action |
| **Presentation** | What does the UI *show or allow*, not what's true | Broadcast's board renders read-only; Coach's shell hides the vMix/export tabs entirely | Role shells |

One open tightening worth deciding (see §7): today's engine validation is
looser than the Lineup's own rule (Lineups already strictly require
exactly 11 starters; formation validation today only requires "at least
one player" and "exactly one GK"). Extending the engine to require exactly
11 positions once Coach becomes a caller would make formation validation
consistent with lineup validation — a decision, not an assumption made
here.

## 6. Database ownership

**Unchanged.** `tactical_formations` / `tactical_positions` remain the
single source of truth for exactly one thing: what does team X's
formation look like for match Y. No new tables, no per-role duplication,
no schema change required for Coach/Admin/Broadcast to all read and write
the *same* rows — that's the entire point of an engine owning the data
instead of each role's feature owning its own copy.

Two additive schema questions come up naturally from the permission model
you described (§7) and are called out explicitly rather than assumed:
whether "submit for approval" and "lock/unlock" need new columns, or
should reuse the `lineups.status`/`lineups.locked` concept that already
exists. See §7.

## 7. Permission boundaries per role — and two open questions

Restating your own direction precisely, mapped onto the layering above:

- **Coach** — create/edit their own team's formation for a match their
  team is in (`requireCoach(token)` + `teamId === team.id`, the same
  ownership check `saveFormation` already does for admin/broadcast, just
  scoped to one team instead of either). Drag-and-drop, formation
  selector, submit.
- **Admin** — view and edit *either* team's formation for any match
  (today's existing `requireRole(["admin","super_admin", ...])` scope,
  unchanged), plus compare both teams and cross-reference Readiness.
- **Broadcast** — **read-only** tactical visualization, export to
  graphics/production tools.

**Open question 1 — this narrows an existing capability.** Today,
`broadcast_operator` can *edit and save* formations (`saveFormation`'s
current role list includes it). Making Broadcast read-only, as described,
is a real permission change to existing, working behavior — worth an
explicit yes before it's built, not an assumption buried in a refactor.

**Open question 2 — "submit for approval" and "lock/unlock" aren't in the
current schema.** `tactical_formations` has no status column at all.
Lineups already have exactly this concept (`lineups.status`:
waiting/submitted/needs_correction, and `lineups.locked`). Two honest
options, not a decision made here:
- (a) Formations inherit the *existing* Lineup's submitted/locked state —
  no new column, "the lineup is locked" already implies "the formation
  built from it is locked." Simpler, reuses a frozen concept.
  (b) Formations get their *own* status independent of the Lineup — a
  coach could submit a formation before or after the Lineup itself is
  locked. More flexible, but a new column on a table Sprint 1 explicitly
  froze, and a second status concept to keep in sync with the Lineup's.

## 8. Future reuse

- **Coach Portal** — the shared board + a Coach-scoped permission action.
  No new rendering work; the drag/drop/formation-select experience Sprint
  1 already built for Broadcast is what Coach gets, just gated
  differently.
- **Admin** — same board, both teams visible (side-by-side or toggle),
  consuming the same `getTacticalFormation` read path already shared with
  Broadcast today.
- **Broadcast** — same board in `readOnly` mode, plus its existing
  Visualizations/Animation/vMix Export tabs, unchanged.
- **Live Center** — a pure consumer of the read path
  (`getTacticalFormation`) and the rendering layer, in display-only mode,
  next to the live timeline/events. No engine or schema work — this is the
  cheapest possible reuse, which is exactly the point of the layering.
- **Graphics Engine** (future phase) — consumes the same `PlacedPlayer[]`
  shape that already exists for this exact reason (the current code
  comment on it: *"the shared shape every visualization mode... reads
  from"*). A PNG/graphics export is a new *rendering target* (canvas/SVG
  instead of DOM), not a new data model — it reads the identical shape
  Broadcast's preview already reads.

## 9. What does not change

- The frozen `tactical_formations`/`tactical_positions` schema (absent a
  decision on §7's open question 2).
- Broadcast's existing Visualizations/Animation Preview/vMix Export
  Preview/Preset Manager — all untouched, all become Broadcast's own shell
  composing the shared board rather than something rebuilt.
- The authorization model established in Sprint 1 (`SECURITY_AUTHORIZATION_MODEL.md`):
  no RLS policies added; every new permission-boundary action still gets
  its own `requireX()` call, still covered by the action-gate coverage
  test from Sprint 1 Closure.

---

## Decisions needed before implementation starts

1. Confirm Broadcast becomes read-only (narrows today's `saveFormation`
   access for `broadcast_operator`).
2. Choose (a) or (b) in §7 for formation submit/lock semantics.
3. Confirm the engine's validation should tighten to exactly 11 positions
   (matching Lineup's own rule) once Coach becomes a caller, rather than
   today's looser "at least one player" check.
