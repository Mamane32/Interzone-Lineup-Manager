# GGSP — Sprint 3, Phase 5: Match Statistics Engine

Implements the confirmed decision: a dedicated, operator-driven
`match_statistics` model — Possession, Shots, Shots on Target, Corners,
Fouls, Offside, Yellow Cards, Red Cards, Saves, all one-click +/- during
the match; Expected Goals as schema-only, no calculation engine.

## Schema — migration 015

One row per (match, team), same shape as `lineups` — auto-created for
both teams the moment a match is created (`matches_create_match_statistics`
trigger, mirroring `lineups`' own `matches_create_lineups`), plus a
one-time backfill insert for the two matches that already existed before
this migration. `expected_goals numeric(4,2)` is nullable and never
written to by application code — the "architecture only" column.

Deliberately **not** derived from `match_events`, even for Yellow/Red
Cards, which already exist as event types elsewhere: "operator-driven,
not inferred from timeline events" was explicit in the product decision.
This is a real, accepted tradeoff, not an oversight — logging a Yellow
Card in the Timeline and clicking +1 Yellow Card in Statistics are two
independent actions that can drift out of sync. Documented here and in
the migration's own comment so it reads as a decision, not a bug, the
next time someone notices the two numbers disagree.

## Service layer

`lib/match-statistics.ts` — `listMatchStatistics(matchId)` (read), plus
two update primitives:
- `adjustMatchStatistic(matchId, teamId, field, delta)` — the shared core
  for all eight independent counters. Read-then-write, clamped at 0 —
  not an atomic increment, matching how `addGoalEvent` already
  read-then-writes `matches.home_score`; an operator's own one-click-at-
  a-time pace has no real concurrent-write scenario to guard against.
- `adjustPossession(matchId, teamId, opponentTeamId, delta)` — the one
  stat that isn't independent. Applies `delta` to one team and the
  inverse to the other in the same call, both clamped 0–100, so the two
  always sum to 100 (verified: pushing home from 50 to 55 correctly took
  away from 50 to 45 in one call).

`app/live/[matchId]/statistics-actions.ts` — the permission boundary
(`requireRole(["broadcast_operator","admin","super_admin"])`), thin
wrappers over the two functions above, `revalidatePath` after each.

## UI

`StatisticsPanel.tsx` rebuilt from a hardcoded `PLACEHOLDER_STATS` array
into a real client component reading `homeStats`/`awayStats` props, with
a `+`/`-` button pair per stat per team (disabled at 0, disabled while a
transition is pending). Gained a `readOnly` prop so the same component
serves both contexts without duplicating the layout: the live Control
Room (`app/live/[matchId]/page.tsx`, editable) and the finished Match
Report (`app/live/[matchId]/report/page.tsx`, `readOnly` — a finished
match shouldn't offer live edits).

`MatchScorePanel.tsx`'s old hardcoded 54/46 possession placeholder,
removed in Phase 1 specifically because this phase would replace it,
is now genuinely superseded — `StatisticsPanel` is the one place
possession renders, and it's real.

## Migration 015 — verification (all 9 steps)

1–2. Created, reviewed (additive only — new table, no changes to
existing ones).
3. Applied inside a transaction against the live database.
4–5. Verified: all 13 columns present with correct types/defaults, all
nine `>= 0` check constraints and the `possession_percent between 0 and
100` constraint present, both FKs (`match_id`, `team_id`) and the
`(match_id, team_id)` unique constraint present.
6. Verified: the backfill produced exactly 4 rows (2 existing matches ×
2 teams), all at defaults, `matches` row count unchanged at 2.
7. Verified the real application code path with temporary data: ran the
exact `adjustMatchStatistic`/`adjustPossession` logic against a real
match (shots +1+1-1 → 1; yellow_cards +1 → 1; possession 50/50 → 55/45
in one call; corners -3 correctly clamped to 0, not negative).
8. Reverted every temporary adjustment back to defaults.
9. Confirmed the final baseline: all 4 rows back at their post-backfill
defaults.

## Quality gate

`npm run typecheck`, `npm run lint`, `npm run test` (129 tests, 13
files), and `npm run build` all pass clean. The temporary `pg` driver
was removed afterward; `package.json`/`package-lock.json` show no diff.
