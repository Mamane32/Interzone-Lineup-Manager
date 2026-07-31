# GGSP — Sprint 2, Phase 2: Formation Engine

Implements the architecture approved in
[SPRINT_2_FORMATION_ENGINE_PROPOSAL.md](SPRINT_2_FORMATION_ENGINE_PROPOSAL.md),
with five decisions confirmed before any code was written:

1. Broadcast becomes strictly read-only — never modifies formations.
2. Formation lifecycle reuses the existing Lineup status/lock model; no
   separate Formation status was introduced.
3. Coach-facing validation tightened: exactly 11 players, exactly one
   goalkeeper, exactly one captain, no duplicate players, valid formation
   layout.
4. The engine is slot-based: it owns formation slots and positioning;
   players are assigned to slots.
5. Rendering stays independent of business logic, reusable verbatim by
   future consumers.

## What changed

**`supabase/migrations/009_formation_engine.sql`** — one additive column,
`tactical_positions.slot_key`, plus a partial unique index
`(tactical_formation_id, slot_key)`. This is the only schema change. No
new Formation-specific status/lock column was added — decision 2 means
"is this formation locked" is answered by the existing
`lineups.status`/`lineups.locked`, not a new column.

**`lib/formations.ts`** — every formation template (all 9 + the custom
fallback) now assigns each slot a stable, unique `slotKey` (`"CB"` → `"CB-1"`/`"CB-2"`
when a label repeats within a formation; unique labels like `"GK"` keep
their own name). This is what makes a slot addressable independent of
which player occupies it.

**`lib/formation-engine.ts`** (new) — the engine's entire authority,
in two pure functions with no DB and no auth:
- `validateFormation()` — the five tightened rules from decision 3, plus
  slot-layout integrity (every assignment maps to a real slot in the
  chosen formation, no two assignments share a slot, every slot is
  filled).
- `resolveSlotPositions()` — named formations always use the engine's own
  template geometry; only `"custom"` trusts caller-submitted coordinates.
  `tacticalPosition` and the goalkeeper flag are *always* derived from the
  slot template, never trusted from a caller.

**`lib/tactical-formation.ts`** — gained `saveFormationCore()`, the one
persistence path shared by every future permission-boundary action. It
validates via the engine, resolves positions, looks up each player's
`shirt_number` from the roster (never trusts a client-submitted shirt
number either), and writes `tactical_formations`/`tactical_positions`.
It has no role check of its own — by design, so a future Coach-side action
gets the identical validation and persistence Admin gets today, not a
second implementation of the same rules.

**`app/live/[matchId]/formation/actions.ts`** — `saveFormation` is now a
thin permission boundary: `requireRole(["admin", "super_admin"])` —
`broadcast_operator` removed per decision 1 — a match/team scope check,
then a single call into `saveFormationCore`. All business validation that
used to live inline here moved to the engine.

**`app/live/[matchId]/formation/page.tsx`** — still gates the page itself
with `requireRole(["broadcast_operator", "admin", "super_admin"])` (viewing
is unchanged), but now also computes `canEdit = role !== "broadcast_operator"`
and passes it down.

**`components/live/formation/TacticalFormationBoard.tsx`** — accepts the
new `canEdit` prop. When false: dragging is disabled, the formation
selector is disabled, the Save button is replaced with a "Read-only —
Broadcast view" chip, the Preset Manager is hidden, and the help text
explains why. `PlayerToken` and `PitchMarkings` needed **zero changes** —
proof that decision 5 (rendering independent of business logic) held: the
entire slot-based rewrite underneath never touched the rendering layer.

## What did not change

- The Visualizations, Animation Preview, Broadcast Preview, and vMix
  Export tabs — untouched, still Broadcast's own presentation modes
  layered on the shared board.
- The frozen `tactical_formations` table and its one-row-per-match-per-team
  shape.
- The Sprint 1 authorization model (`SECURITY_AUTHORIZATION_MODEL.md`) —
  no RLS policies added; the narrowed role list is still covered by the
  action-gate coverage test.

## Not built this phase

Per the agreed sequencing, Phase 2 is the engine plus Admin/Broadcast
adapting to it — **not** the Coach Portal UI itself. No coach-facing
formation page or coach-scoped permission action was created; that's
Phase 3's first task, and it will call the exact same `saveFormationCore`
this phase built, with its own `requireCoach(token)` + own-team scope
check in place of Admin's `requireRole`.

## Testing

`tests/characterization/formation-engine.test.ts` (new, 14 tests) — every
validation rule individually (too few/too many players, zero/multiple
goalkeepers, zero/multiple captains, duplicate players, off-roster
players, invalid/duplicate/missing slots), formation-independence (a valid
4-3-3 assignment is rejected against 4-4-2's slots), and
`resolveSlotPositions`'s named-formation-overrides-caller-coordinates /
custom-formation-trusts-caller-coordinates behavior.

`tests/security/action-gates.test.ts` updated: the save action's role list
assertion narrowed to admin/super_admin with an explicit check that
`broadcast_operator` never appears inside the actual `requireRole(...)`
call (a new, separate assertion confirms the *page* gate still includes
it, since viewing remains allowed).

`tests/migrations/migration-integrity.test.ts` updated to include
`009_formation_engine.sql` in the expected sequence.

**Full gate:** typecheck clean, lint clean, **115/115 tests** (21 new),
clean production build.
