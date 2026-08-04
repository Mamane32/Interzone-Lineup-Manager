-- ============================================================================
-- SPRINT 3 PHASE 2 — Coach Team Roster Module (Item B)
-- ============================================================================
-- Additive only. Run AFTER 019_find_auth_user_by_email.sql.
--
-- The Team Roster becomes the coach-owned, permanent source of truth every
-- match-facing feature reads from (Sprint 3 Phase 2 Master Plan §4). This
-- adds the fields the roster's coach-facing CRUD needs; none of it changes
-- how lineups/match_events already reference players (they already use
-- player_id foreign keys, confirmed by direct schema inspection — no
-- free-text player references exist to fix).
--
-- Safe as a single transaction: player_availability_status is a brand-new
-- type, not a new value added to an existing one, so the "can't use a new
-- enum value in the same transaction it was added in" rule (which applies
-- to `alter type ... add value`) does not apply here.

do $$
begin
  if not exists (select 1 from pg_type where typname = 'player_availability_status') then
    create type player_availability_status as enum ('available', 'doubtful', 'injured', 'suspended');
  end if;
end $$;

alter table players add column if not exists position text;
alter table players add column if not exists photo_url text;
alter table players add column if not exists preferred_foot text;
alter table players add column if not exists is_captain boolean not null default false;
alter table players add column if not exists active boolean not null default true;
alter table players add column if not exists availability_status player_availability_status not null default 'available';

-- At most one default captain per team — a roster-level default (see
-- Master Plan §4.3), distinct from lineups.captain_id's per-match override.
create unique index if not exists players_one_captain_per_team
  on players (team_id) where is_captain = true;

create index if not exists players_team_active_idx on players (team_id) where active = true;

-- Player photo storage — same public-read pattern as coach-photos
-- (migration 010) and every other asset bucket in this platform.
insert into storage.buckets (id, name, public)
values ('player-photos', 'player-photos', true)
on conflict (id) do nothing;
