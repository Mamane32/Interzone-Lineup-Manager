# GGSP — Migration Discipline

Written after discovering, mid-Sprint-2, that migration
`007_tactical_formations.sql` had never actually been applied to the live
database — despite the Tactical Formation Panel being built, tested
(statically), and treated as production-real for the rest of Sprint 1 and
the first half of Sprint 2. This document is the root cause explanation
and the standing process that replaces the informal one that let this
happen.

## What actually happened

Before this incident, the live database had every table from migrations
002–006 and 008, but **not** 007. Confirmed directly against the database
(not inferred): a full `information_schema.tables` listing showed
`match_events`, `profiles`, `user_access_assignments`, `invitations`,
`audit_logs`, `role_metadata`, `organizations`, `seasons`, `divisions`,
`stages`, `competition_groups`, `venues` all present — and `tactical_formations`
/ `tactical_positions` absent, along with the `formation_name` enum.

Migration **008** (Competition Completion, applied earlier this same
Sprint 2 session) had no dependency on 007's tables, so applying it did
not surface the gap. Migration **009** (the Formation Engine's `slot_key`
column) does — it runs `alter table tactical_positions add column ...`,
which fails outright if that table doesn't exist. That's what forced the
discovery.

## Why Sprint 1 appeared to work anyway

Three independent gaps compounded, none of which is "the" root cause on
its own:

**1. The automated quality gate cannot see the live database at all.**
`npm run typecheck`, `npm run lint`, and `npm test` are static analysis and
pure-function tests — none of them connect to Supabase. `npm run build`
compiles the code but does not execute a single dynamic route's data
fetching (Next.js doesn't render `force-dynamic` pages at build time — the
same reason last Sprint's `/auth/callback` build error was invisible until
someone actually built with a clean cache). A missing table was
structurally invisible to every check this project runs automatically.

**2. The one manual test that would have caught it was never confirmed
done.** The Sprint 1 UAT checklist explicitly included "Formation → try
all 9 presets + Custom, drag a player, save, reload and confirm it
persisted." The UAT guide's own data check reported "zero
`tactical_formations` saved" — at the time, this was written up as an
expected, honest "nothing's been saved yet," not investigated further as
"has this actually been attempted, and if so, what happened." Both
readings were consistent with the same zero count; only one was true.

**3. Verification this session trusted inherited context instead of the
live database.** When Sprint 2's Formation Engine work began, the
existing Tactical Formation Panel was treated as real, working
infrastructure — because everything *about* it (code, prior session
summaries, the UAT guide) described it that way — without independently
querying the live database to confirm the tables existed before building
substantially on top of them. When migration 008 was applied and verified
a few phases earlier, the verification covered "did 008 itself apply
correctly," not "has every migration in the numbered sequence up to and
including this one actually been applied" — a narrower check that missed
the gap in what it wasn't looking for.

## Classification

Not a different database, not an unused code path in the ordinary sense
(the Formation Panel route, UI, and Server Action are all real and
reachable) — this was **a missed manual deployment step** (007's own
header comment says, like every migration, "run this in the Supabase SQL
editor" — a human action, and for this one file specifically, it seems it
never happened) **combined with zero automated visibility into live
schema state**, which is what let it go unnoticed for an entire sprint.

## The migration lifecycle, going forward

Every migration — no exceptions — is only "done" once all nine steps
below are complete. This replaces "write the .sql file and assume it gets
run":

1. **Create** the migration.
2. **Review** it (does it depend on a prior migration's tables? is it
   additive-only? does `tests/migrations/migration-integrity.test.ts`'s
   sequence list include it?).
3. **Apply** it — inside a transaction, against the real database.
4. **Verify schema** — every table/column the migration claims to add
   actually exists, with the right type and nullability.
5. **Verify constraints** — every FK, unique constraint, check constraint,
   and enum value matches the migration file exactly.
6. **Verify data integrity** — existing rows are byte-for-byte unchanged;
   row counts match the pre-migration baseline plus only what the
   migration intentionally added.
7. **Verify the application code path** — the real save/read logic
   (business rules included, not just raw SQL) against the live, migrated
   schema, using temporary data.
8. **Remove temporary validation data** — every row created for step 7 is
   deleted.
9. **Confirm the database baseline** — a final count/read confirming the
   database matches its pre-migration state exactly, except for the
   migration's intended schema changes.

Migrations 007, 008, and 009 have all now been run through this exact
process (007 and 009 in one combined session after this incident was
found; 008 was re-confirmed against the same standard). No future
migration in this project should be considered complete with fewer than
all nine steps verified and reported.

## What would have caught this sooner

Steps 3–6 above, run for *every* migration at the time it was supposedly
applied, would have caught 007's absence the moment 008 was written (008
doesn't depend on 007, but step 3's transaction-apply-and-verify habit,
done consistently, would have surfaced the database's real table list
during 008's own baseline check). The gap wasn't a lack of process for
008 and 009 — it's that 007 predates this discipline existing at all.
