# GGSP — Production Queue Engine

Implements Decision 2 (persisted Graphics Queue), generalized per product
decision before implementation: not a Graphics-specific table, a
consumer-agnostic, event-driven queue with Graphics as its first real
consumer. Builds on
[SPRINT_2_PHASE_4_GRAPHICS_QUEUE_PROPOSAL.md](SPRINT_2_PHASE_4_GRAPHICS_QUEUE_PROPOSAL.md)'s
approved schema shape and dispatch-reuse plan; every design decision
below that changed from that proposal is called out explicitly.

## 1. What generalized, and why

| Proposal (Graphics-specific) | Implementation (generic) |
|---|---|
| `graphics_queue` table | `production_queue` — one table, any consumer |
| `category check ('pre','in','post')` | `category text` — unconstrained; only Graphics happens to use pre/in/post today, a future consumer (Countdown, Commercial Breaks) will have its own vocabulary |
| Dispatch hardcoded to `GraphicsEngine.takeGraphic/hideGraphic` | A `consumer` column + a registered-handler lookup — `take()`/`hide()` call whichever handler matches an item's `consumer`, never a hardcoded function |
| One-live-per-match | One-live-**per-(match, consumer)** — Replay being live doesn't block Graphics, matching how a real console runs them as independent channels |

`status` (`queued`/`live`/`hidden`) is still a checked enum — that state
machine is a true invariant of the queue itself, identical for every
consumer. `consumer` is deliberately **not** a checked enum: Replay,
Animations, Sponsor Graphics, Commercial Breaks, Transitions, Audio Cues,
Countdown, and future Automation/AI modules are all named future
consumers — none of them should ever need a migration just to be allowed
to enqueue something.

## 2. The registry — "event-driven" in practice

`lib/broadcast/ProductionQueueEngine.ts` holds `REGISTERED_CONSUMERS`, an
array of `{ consumer, onTake, onHide }` handlers — the exact same shape
`BroadcastEngine.ts` already uses for `REGISTERED_SYSTEMS` (VMixEngine
today, a future ObsEngine/RossEngine tomorrow, zero change to anything
that calls `dispatch()`). `takeProductionItem()`/`hideProductionItem()`
persist the state change, then look up and call whichever handler matches
that item's `consumer` — the engine itself never branches on consumer
type. Graphics is the only real entry:

```ts
const graphicsConsumerHandler: ProductionQueueConsumerHandler = {
  consumer: "graphics",
  onTake: (item) => takeGraphic({ matchId: item.matchId, graphicId: item.itemKey, category: item.category }),
  onHide: (item) => hideGraphic({ matchId: item.matchId, graphicId: item.itemKey }),
};
```

Adding Replay, Animations, or any other consumer later is: write its own
`onTake`/`onHide`, push it onto this array. No schema change, no change
to `enqueue`/`take`/`hide`/`list`. Matches `automation-hooks.ts`'s own
"extension point, not automation" rule — nothing is scaffolded for a
consumer before it has real dispatch logic of its own.

## 3. Graphics as the first consumer

`components/live/BroadcastPanel.tsx`'s Take/Hide were local `useState`
only (per its own doc comment) — a page refresh silently lost whatever
was "live." Rewired to a server-driven model, the same pattern every
other live page in this app already uses: `app/live/[matchId]/page.tsx`
reads `listProductionQueue(match.id, "graphics")` fresh on every render
and passes it down as an `items` prop — `BroadcastPanel` holds no
persisted state of its own, only the transient "which tab is open" UI
state. Take/Hide call two new permission-boundary actions in
`app/live/[matchId]/production-queue-actions.ts`
(`takeCatalogGraphic`/`hideQueueItem`, gated by the same
`requireRole(["broadcast_operator","admin","super_admin"])` every other
Broadcast Control Center action uses), each ending in `revalidatePath`
so the acting tab's next render sees the fresh queue state — no client
cache to invalidate.

Every Take click enqueues a fresh row rather than reusing one per catalog
entry — the queue is also a same-match history of what actually aired,
not just a single mutable "what's live now" slot. `removeProductionItem()`
only permits deleting a still-`queued` row for exactly that reason; a
live or already-hidden item stays.

`lib/broadcast/BroadcastSession.ts`'s `graphics` subsystem entry updated
from `state: "planned"` (`"Broadcast Graphics panel is UI-only today, no
persisted state"`) to `state: "active"` — it no longer is.

## 4. Migration 013 — verification (all 9 steps)

1–2. Created, reviewed (additive only — one new table, no changes to
anything existing).
3. Applied inside a transaction against the live database.
4–5. Verified schema and constraints directly: every column/type/
nullability matches the migration; the FK cascade, the `status` check,
and — critically — the partial unique index enforcing one live row per
`(match_id, consumer)` all exist exactly as written.
6. Verified data integrity: `matches` row count unchanged (2, before and
after); `production_queue` at 0 rows immediately after migration.
7. Verified the real application code path with temporary data against a
real match id: enqueued two items, took the first (→ live), took the
second (→ live, and confirmed the first was automatically flipped to
`hidden` by the same operation) — then, separately, attempted to force a
second `live` row directly and confirmed the database itself rejects it
(`duplicate key value violates unique constraint
"production_queue_one_live_per_consumer"`), proving the constraint is a
real backstop, not just an engine convention.
8. Deleted both temporary rows.
9. Confirmed final baseline: `production_queue` back to 0 rows, `matches`
still at 2.

## 5. Quality gate

`npm run typecheck`, `npm run lint`, `npm run test` (127 tests, 13
files), and `npm run build` all pass clean. The temporary `pg`/`tsx`
tooling used to apply and validate the migration was removed afterward;
`package.json`/`package-lock.json` show no diff.

## Not yet done

Replay, Animations, Sponsor Graphics, Commercial Breaks, Transitions,
Audio Cues, Countdown, and Automation/AI consumers have no handler
registered and no UI — they were named as future consumers, not built
speculatively, per the same discipline `automation-hooks.ts` already
established. `reorderProductionQueue()` exists on the engine (queue
reordering was part of the original approved design) but has no UI
wired to it yet — no reorder interaction was part of this pass's scope.
