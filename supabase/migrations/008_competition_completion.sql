-- ============================================================================
-- SPRINT 2 — COMPETITION COMPLETION
-- ============================================================================
-- Additive only. Run AFTER 007_tactical_formations.sql. Nothing existing is
-- altered, renamed, or dropped. Every new column is nullable, so every
-- existing match row remains valid with no backfill required.
--
-- Closes the gap identified during Sprint 1 Closure: the Competition
-- Foundation hierarchy (organization -> competition -> season -> division
-- -> stage -> group) and the Venues table were fully built with their own
-- admin CRUD, but `matches` only ever referenced `competition_id` directly
-- — a League Administrator could structure a competition in full and then
-- discover none of that structure applied to actually scheduling a match
-- within it. This migration is the fix.

alter table matches
  add column if not exists season_id uuid references seasons(id) on delete set null,
  add column if not exists division_id uuid references divisions(id) on delete set null,
  add column if not exists stage_id uuid references stages(id) on delete set null,
  add column if not exists group_id uuid references competition_groups(id) on delete set null,
  add column if not exists venue_id uuid references venues(id) on delete set null;

-- `venue` (free text) is untouched and still supported — a match without a
-- formal Venue row (a neutral ground, a one-off school pitch) can still
-- carry a plain text label. `venue_id`, when set, is what the platform
-- treats as authoritative (real address, GPS, capacity); `venue` remains a
-- display-only fallback the same way it already worked before this
-- migration. Neither column being NULL is an error — a match may have
-- neither, either, or both.

create index if not exists matches_season_idx on matches (season_id);
create index if not exists matches_division_idx on matches (division_id);
create index if not exists matches_stage_idx on matches (stage_id);
create index if not exists matches_group_idx on matches (group_id);
create index if not exists matches_venue_idx on matches (venue_id);

-- ---------------------------------------------------------------------------
-- Hierarchy consistency — a REAL database constraint, not just application
-- discipline (matching the precedent set by seasons_one_active_per_competition
-- and the audit_logs immutability triggers). Two jobs, both handled here:
--
--  1. VALIDATE: if more than one level is set, they must actually nest
--     correctly (a group's stage must match the match's own stage_id, etc.)
--     — rejects an admin picking a group from one stage but a different
--     stage directly, which would otherwise silently create a contradictory
--     row.
--  2. AUTO-FILL: an admin only ever needs to pick the MOST SPECIFIC level
--     they know (e.g. just the group, or just the season) — every less
--     specific ancestor is derived automatically. This is what keeps the
--     match-creation form to one cascading picker instead of forcing five
--     redundant selections for every match.
-- ---------------------------------------------------------------------------
create or replace function check_match_hierarchy_consistency()
returns trigger as $$
declare
  v_group_stage_id uuid;
  v_stage_division_id uuid;
  v_division_season_id uuid;
  v_season_competition_id uuid;
begin
  if new.group_id is not null then
    select stage_id into v_group_stage_id from competition_groups where id = new.group_id;
    if v_group_stage_id is null then
      raise exception 'match.group_id % does not exist', new.group_id;
    end if;
    if new.stage_id is not null and new.stage_id <> v_group_stage_id then
      raise exception 'match.group_id does not belong to match.stage_id';
    end if;
    new.stage_id := v_group_stage_id;
  end if;

  if new.stage_id is not null then
    select division_id into v_stage_division_id from stages where id = new.stage_id;
    if v_stage_division_id is null then
      raise exception 'match.stage_id % does not exist', new.stage_id;
    end if;
    if new.division_id is not null and new.division_id <> v_stage_division_id then
      raise exception 'match.stage_id does not belong to match.division_id';
    end if;
    new.division_id := v_stage_division_id;
  end if;

  if new.division_id is not null then
    select season_id into v_division_season_id from divisions where id = new.division_id;
    if v_division_season_id is null then
      raise exception 'match.division_id % does not exist', new.division_id;
    end if;
    if new.season_id is not null and new.season_id <> v_division_season_id then
      raise exception 'match.division_id does not belong to match.season_id';
    end if;
    new.season_id := v_division_season_id;
  end if;

  if new.season_id is not null then
    select competition_id into v_season_competition_id from seasons where id = new.season_id;
    if v_season_competition_id is null then
      raise exception 'match.season_id % does not exist', new.season_id;
    end if;
    if new.competition_id is not null and new.competition_id <> v_season_competition_id then
      raise exception 'match.season_id does not belong to match.competition_id';
    end if;
    new.competition_id := v_season_competition_id;
  end if;

  return new;
end;
$$ language plpgsql;

drop trigger if exists matches_check_hierarchy on matches;
create trigger matches_check_hierarchy
  before insert or update on matches
  for each row execute procedure check_match_hierarchy_consistency();

-- No RLS changes needed — `matches` already has RLS enabled with no public
-- policies since supabase/schema.sql; these are just new nullable columns
-- on an already-locked-down table.
