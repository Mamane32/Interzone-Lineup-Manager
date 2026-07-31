# GGSP — Sprint 2, Phase 1: Competition Completion

Closes the gap identified during Sprint 1 Closure (Product Acceptance
review): the Competition Foundation hierarchy — organization → competition
→ season → division → stage → group — and the Venues table were fully
built with their own admin CRUD, but `matches` only ever referenced
`competition_id` directly. A League Administrator could structure a
competition end-to-end and then discover none of that structure applied to
actually scheduling a match within it.

## What changed

**`supabase/migrations/008_competition_completion.sql`** — additive only,
five new nullable columns on `matches`:

```
season_id   -> seasons(id)              on delete set null
division_id -> divisions(id)            on delete set null
stage_id    -> stages(id)               on delete set null
group_id    -> competition_groups(id)   on delete set null
venue_id    -> venues(id)               on delete set null
```

The existing `venue` free-text column is untouched and still supported — a
match without a formal `Venue` row (a neutral ground, a one-off school
pitch) can still carry a plain text label exactly as before. `venue_id`,
when set, is what a future feature should treat as authoritative (real
address, GPS, capacity); neither being NULL is an error.

**A real database constraint, not just application discipline** — a
`before insert or update` trigger (`check_match_hierarchy_consistency`)
does two things on every write:

1. **Validates** that whichever levels are set actually nest correctly (a
   `group_id` from Stage A can't be combined with an explicit `stage_id`
   pointing to Stage B — the write is rejected with a clear error instead
   of silently creating a contradictory row).
2. **Auto-fills** every less-specific ancestor from the most specific level
   provided. Pick a Group, and Stage/Division/Season/Competition are
   derived automatically. This is why the admin UI only needs one cascading
   picker instead of forcing five redundant selections per match — the
   database does the backfill, not the form.

This follows the same "real constraint, not just discipline" precedent set
in Sprint 1 by `seasons_one_active_per_competition` and the `audit_logs`
immutability triggers, rather than introducing a new enforcement style.

**`app/admin/matches/`** — the match-creation form now includes
`components/foundation/MatchHierarchyFields.tsx`, a client component
rendering Season/Division/Stage/Group/Venue as cascading selects (each
filtered by its parent's current selection). The match list now shows the
resolved hierarchy breadcrumb and venue when set. `createMatch` passes
through whichever fields were chosen and surfaces a real error (via the
existing `?error=` pattern) if the trigger rejects the combination.

**Not changed:** the one existing match from Sprint 1 testing keeps
`season_id`/`division_id`/`stage_id`/`group_id`/`venue_id` all `NULL` — no
backfill was performed, since there's no real data to backfill it *with*
(picking an arbitrary season for it would be fabricating history, not
recovering it). It remains exactly as valid as it was before this
migration; the hierarchy is opt-in per match going forward.

## Standings foundation — readiness, not implementation

Explicitly **not built this phase** (per Sprint 2 scope: "future standings
foundation," not "build standings now"). What this phase makes possible for
whenever that feature is built:

- Every match can now be scoped to a `group_id` (or `division_id`/
  `season_id` if the competition doesn't use groups) — the actual
  grouping a standings table would need to segment by.
- `matches.home_score`/`away_score` (Sprint 1) plus `live_status = 'full_time'`
  already identify a completed result.
- `competitions.points_win`/`points_draw`/`points_loss` (migration 006)
  already hold the scoring rule per competition.

A future standings feature is therefore a read-only aggregation query over
existing columns — `group by group_id` (or `division_id`/`season_id`),
`sum` points per the competition's own win/draw/loss values, count
`home_score`/`away_score` for goal difference — with no further schema
change required. This is intentionally as far as this phase goes.

## Testing

`tests/characterization/match-hierarchy.test.ts` (new) verifies: all five
columns are nullable, the trigger both validates and backfills ancestors,
`lib/types.ts` carries the new fields, `createMatch` wires them through and
handles a rejected write, and the admin UI's cascading filters are real
(not just five independent dropdowns). `tests/migrations/migration-integrity.test.ts`
updated to include `008_competition_completion.sql` in the expected
migration sequence.

## Next (per the agreed Sprint 2 order)

Formation Engine — the shared, reusable formation/pitch system consumed by
Coach, Admin, and Broadcast experiences alike.
