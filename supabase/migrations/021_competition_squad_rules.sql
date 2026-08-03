-- ============================================================================
-- SPRINT 3 PHASE 2 — Match Squad Workflow (Item B)
-- ============================================================================
-- Additive only. Run AFTER 020_player_roster_fields.sql.
--
-- Three independent, per-competition rules (Master Plan §4.2a) — replacing
-- what is today a hardcoded bench size of 9 in both LineupForm.tsx and
-- submitLineup (app/team/[token]/actions.ts). max_bench defaults to 9 so no
-- existing competition's behavior changes silently. match_squad_size and
-- max_substitutions default to no cap (null), since no such concept exists
-- in the app today to preserve a default for.
--
-- max_substitutions is enforced at a different point than the other two
-- (in-game substitution tracking via match_events, not Lineup submission) —
-- stored here now so Operations Overview / Live Center work can read it
-- later, per the Master Plan.

alter table competitions add column if not exists match_squad_size int;
alter table competitions add column if not exists max_bench int not null default 9;
alter table competitions add column if not exists max_substitutions int;

do $$
begin
  if not exists (select 1 from pg_constraint where conname = 'competitions_match_squad_size_positive') then
    alter table competitions add constraint competitions_match_squad_size_positive
      check (match_squad_size is null or match_squad_size >= 11);
  end if;

  if not exists (select 1 from pg_constraint where conname = 'competitions_max_bench_nonnegative') then
    alter table competitions add constraint competitions_max_bench_nonnegative
      check (max_bench >= 0);
  end if;

  if not exists (select 1 from pg_constraint where conname = 'competitions_max_substitutions_nonnegative') then
    alter table competitions add constraint competitions_max_substitutions_nonnegative
      check (max_substitutions is null or max_substitutions >= 0);
  end if;
end $$;
