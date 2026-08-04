# GGSP — Persisted Graphics Queue Architecture Proposal

No implementation in this document — this is the design to review before
Decision 2 of Sprint 2 Phase 4 starts. Grounded in what exists today
(`BroadcastPanel.tsx`, `lib/broadcast/GraphicsEngine.ts`), not a
clean-slate redesign.

---

## 1. What already exists

| File | What it actually is today |
|---|---|
| `components/live/BroadcastPanel.tsx` | A **fixed catalog** of graphic names, hardcoded per category (Pre/In/Post-Match) as plain strings — not rows in any table. "Live" is a single `useState<string \| null>` in the component. Nothing persists; a page refresh silently clears whatever was "live." |
| `lib/broadcast/GraphicsEngine.ts` | `takeGraphic()` / `hideGraphic()` already exist, already dispatch through `AutomationPipeline → BroadcastEngine → VMixEngine`, and already work end-to-end against whichever systems are registered. **Unused** — `BroadcastPanel` doesn't call them. This is the one piece of the eventual queue that needs no new code at all. |
| `lib/broadcast/types.ts` | `BroadcastCommand`'s `graphic.take` / `graphic.hide` variants already carry exactly `{ matchId, graphicId, category }` — already shaped for a queue item, not just a catalog string. |
| The rest of `lib/broadcast/*` | System-agnostic by design (`BroadcastSystemEngine` interface, `VMixEngine` the only registered implementation today). The queue sits entirely above this layer and changes nothing in it. |
| Every other live page in the app | Server-rendered (`force-dynamic`), read fresh per request, updated via a Server Action's implicit re-render of the acting tab. **No realtime, no polling, no websocket exists anywhere in this codebase today** — confirmed by grep across `components/live` and the whole repo. Any cross-session sync this proposal introduces would be a first for GGSP, not an extension of an existing pattern. |

**The actual gap is narrower than "build a queue from scratch":** the
dispatch chain and the command vocabulary already exist and already work.
What's missing is (a) a durable row per queued graphic instead of a
catalog string, and (b) the state machine — queued → live → hidden — that
today lives nowhere at all.

---

## 2. Proposed layering

```
┌─────────────────────────────────────────────────────────────────┐
│ RENDERING LAYER (client)                                          │
│   BroadcastPanel.tsx — renders whatever GraphicsQueueService       │
│   returns; no longer owns "live" state itself                     │
└─────────────────────────────────────────────────────────────────┘
                              ▲ calls
┌─────────────────────────────────────────────────────────────────┐
│ PERMISSION BOUNDARY (server, one thin action file)                │
│   app/live/[matchId]/graphics/actions.ts  (NEW)                   │
│   requireRole(["broadcast_operator","admin","super_admin"]) →      │
│   call the shared service below. Same three roles that already    │
│   reach the Broadcast Control Center at all — this is not a new   │
│   permission tier, just a new action file alongside               │
│   formation/actions.ts and the existing live/[matchId]/actions.ts │
└─────────────────────────────────────────────────────────────────┘
                              ▲ calls
┌─────────────────────────────────────────────────────────────────┐
│ SERVICE (server-only, role-agnostic — the "reusable Graphics       │
│ Queue service" the decision asks for, not a page-local hook)       │
│   lib/broadcast/GraphicsQueueService.ts  (NEW)                    │
│   enqueue · take · hide · reorder · remove · list                 │
│   `take` and `hide` are the ONLY two operations that also call     │
│   GraphicsEngine.takeGraphic()/hideGraphic() — persistence and     │
│   dispatch happen in the same service call, never two separate    │
│   round trips a caller could invoke out of order                  │
└─────────────────────────────────────────────────────────────────┘
                       ▲ reads/writes         ▲ dispatches
┌──────────────────────────────────┐  ┌───────────────────────────┐
│ DATABASE                          │  │ lib/broadcast/GraphicsEngine│
│ graphics_queue (NEW, migration 012)│  │ (UNCHANGED — already correct)│
└──────────────────────────────────┘  └───────────────────────────┘
```

This mirrors the Formation Engine's already-established shape: a
role-agnostic core the permission boundary calls into, not business logic
embedded in the Server Action itself.

---

## 3. Schema — `graphics_queue` (migration 012)

```sql
create table if not exists graphics_queue (
  id uuid primary key default gen_random_uuid(),
  match_id uuid not null references matches(id) on delete cascade,
  category text not null check (category in ('pre', 'in', 'post')),
  graphic_key text not null,   -- stable catalog identity, e.g. "starting_lineup", "goal"
  name text not null,          -- display label at time of queueing (catalog rename-safe)
  payload jsonb,               -- optional per-instance data (e.g. which player, for a Goal graphic queued twice)
  status text not null default 'queued' check (status in ('queued', 'live', 'hidden')),
  queue_order integer not null default 0,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index if not exists graphics_queue_match_idx on graphics_queue (match_id);
create index if not exists graphics_queue_status_idx on graphics_queue (match_id, status);

-- Mirrors BroadcastPanel's existing rule: only one graphic live per match.
create unique index if not exists graphics_queue_one_live_per_match
  on graphics_queue (match_id) where (status = 'live');

create trigger graphics_queue_set_updated_at
  before update on graphics_queue for each row execute procedure set_updated_at();
```

Notes on choices, so they can be challenged before this is built:

- **No `created_by` column.** Checked the existing convention:
  `match_events` (the closest analog — operator-logged, per-match rows)
  has no actor column either; actor attribution in this codebase lives
  entirely in `audit_logs.actor_user_id`, not scattered per domain table.
  Following that precedent rather than inventing a new one. If per-row
  attribution turns out to matter for Graphics specifically, that's an
  audit-log write inside the Server Action, not a schema change here.
- **`graphic_key` vs `name`.** `BroadcastPanel`'s catalog is currently
  just display strings ("Starting Lineup", "Goal"). Splitting identity
  (`graphic_key`, stable) from label (`name`, display-only) means
  relabeling a catalog entry later doesn't orphan queue history, and
  `payload` lets the same `graphic_key` be queued more than once with
  different data (two different "Goal" graphics for two different
  scorers) — something a plain catalog string can't express today.
- **`set_updated_at()` reused**, not a new trigger function — the shared
  one already exists and is used by ten other tables.

---

## 4. Service contract

```ts
// lib/broadcast/GraphicsQueueService.ts — server-only, no role check (matches
// lib/tactical-formation.ts's own precedent: the engine trusts its caller).

enqueue(matchId, category, graphicKey, name, payload?) → GraphicsQueueItem
take(matchId, itemId) → persists status='live' (hiding whatever was live
  before it, matching BroadcastPanel's existing single-live-item rule),
  THEN calls GraphicsEngine.takeGraphic(). If dispatch fails, the queue
  row still reflects 'live' — persistence is the source of truth for
  "what should be on air," dispatch failure is a system-connectivity
  problem surfaced via BroadcastCommandResult, not a reason to roll back
  state an operator can see.
hide(matchId, itemId) → persists status='hidden', calls
  GraphicsEngine.hideGraphic()
reorder(matchId, category, orderedItemIds) → bulk queue_order update
remove(matchId, itemId) → delete (only valid for status='queued' — can't
  delete something currently live or already aired without hiding first)
list(matchId) → GraphicsQueueItem[], grouped by category — what
  BroadcastPanel renders
```

---

## 5. The "survive refresh / reconnect / restart / handoff" requirement

Persisting to `graphics_queue` already satisfies this literally: the
table is the state, not a browser tab. A refreshed page, a reconnected
operator, or operator B taking over from operator A on a different
machine all get the same `list(matchId)` result because it's a fresh
`force-dynamic` read from the database — exactly how every other page in
this app already gets its data.

What persistence does **not** give for free: if operator A and operator B
have the Graphics tab open **at the same time** in two different
sessions, and A takes a graphic live, B's already-rendered page doesn't
know until B does something that re-fetches (navigate, refresh, or a
Server Action of B's own). This is a real gap, but it is the exact same
gap every other concurrently-viewed live page in this app already has
today — Section 1 confirmed there is no realtime or polling anywhere in
GGSP currently. Closing it is a separate, larger decision (websockets,
Supabase Realtime, or polling) that affects every live page, not just
Graphics, so it does not belong bundled into this proposal. Three ways to
handle it here, in order of how much they cost:

1. **Do nothing extra now.** Ship on the same implicit-refresh model as
   the rest of the app. A single-operator console (today's actual usage)
   never notices. Two operators on the same match simultaneously would
   see stale state until they navigate — a real but pre-existing category
   of gap, not a new one this feature introduces.
2. **Add a short client polling interval (e.g. every 4–6s) to
   `BroadcastPanel` only**, re-fetching `list(matchId)` — cheap, no new
   infrastructure, first use of a pattern that doesn't exist yet in this
   codebase but is a small, well-understood one.
3. **Supabase Realtime subscription** on `graphics_queue` — true push
   updates, but a genuinely new dependency/pattern for the whole app, not
   scoped to Graphics alone, and the heavier of the three options.

Recommendation: **option 1 for the initial build**, since it satisfies
every literal requirement in Decision 2 (refresh/reconnect/restart/
handoff all involve a fresh page load, which already works) without
introducing a new cross-cutting pattern on the strength of one panel.
Revisit option 2 if concurrent multi-operator usage on the same match
turns out to be a real operating pattern, not a hypothetical one.

---

## 6. What changes in `BroadcastPanel.tsx`

- Loses its hardcoded `CATEGORIES` catalog as the source of *state*, but
  the catalog itself (which graphics exist per category) still needs to
  live somewhere as the "what can be queued" list — proposed to keep it
  as a static const (unchanged from today) that `enqueue()` reads
  `graphic_key`/`name`/`category` from, rather than turning the catalog
  itself into a database table. The catalog is a fixed product decision
  (which graphic types exist), not per-match data — no operator needs to
  add a new *kind* of graphic, only queue instances of the existing kinds.
- `onTake`/`onHide` become Server Action calls into the new
  `graphics/actions.ts`, not local `setLiveItem` calls.
- Needs a queueing affordance that doesn't exist today at all (the
  current UI only has Take/Hide on an always-visible catalog item, no
  concept of "add this to the queue for later"). Proposed: keep every
  catalog item always visible and clickable exactly as today (so nothing
  about today's fast Take-anything workflow regresses), and add the queue
  strictly as an *ordering/history* concern — a visible strip of
  queued/live/hidden items per category above the catalog grid, built
  from `list(matchId)`.

---

## 7. What does not change

- `lib/broadcast/GraphicsEngine.ts`, `AutomationPipeline`, `BroadcastEngine`,
  `VMixEngine`, `BroadcastCommand`'s shape — all already correct, all
  reused as-is.
- The three-role permission model (`broadcast_operator`, `admin`,
  `super_admin`) — no new role, no new gate shape.
- Every other live page's data-fetching model — this proposal
  deliberately does not introduce realtime/polling as a global pattern
  (see Section 5).

---

## Decisions needed before implementation starts

1. **Section 5's sync model** — ship on option 1 (no new sync mechanism,
   rely on the existing refresh-driven model) as recommended, or
   require option 2 (polling) from day one because concurrent
   multi-operator usage on one match is expected to be common?
2. **Catalog ownership** — confirm the graphic catalog (which graphic
   *kinds* exist per category) should stay a static const in code, not
   become its own admin-editable database table. If a future need
   arises for non-technical staff to add new graphic kinds without a
   deploy, that's a different, larger feature than this proposal covers.
3. **`remove()`'s restriction to `status='queued'`** — confirm a
   currently-live or already-hidden graphic can only leave the queue by
   being hidden first, never deleted outright, so the queue also serves
   as a same-match history of what actually aired.
