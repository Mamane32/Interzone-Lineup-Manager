-- ============================================================================
-- TACTICAL FORMATION PANEL
-- ============================================================================
-- Additive only. Two new tables, nothing existing is altered. Run this
-- AFTER 006_competition_foundation.sql.
--
-- One formation per (match, team) — an operator prepares each team's
-- tactical lineup for a specific match, not a standing "default formation"
-- for the team in general. Re-saving overwrites that match/team's
-- formation, it does not create a second one (see the unique index below).

create type formation_name as enum (
  '4-4-2',
  '4-3-3',
  '3-5-2',
  '3-4-3',
  '4-2-3-1',
  '4-1-4-1',
  '5-3-2',
  '5-4-1',
  '4-5-1',
  'custom'
);

-- ---------------------------------------------------------------------------
-- tactical_formations — one row per (match, team): which formation shape
-- an operator has prepared. The actual per-player placement lives in
-- tactical_positions below, so switching formations doesn't lose history —
-- deleting a formation's positions and re-inserting a fresh auto-placed set
-- is a normal save, not a destructive migration concern.
-- ---------------------------------------------------------------------------
create table if not exists tactical_formations (
  id uuid primary key default gen_random_uuid(),
  match_id uuid not null references matches(id) on delete cascade,
  team_id uuid not null references teams(id) on delete cascade,
  formation formation_name not null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (match_id, team_id)
);

create index if not exists tactical_formations_match_idx on tactical_formations (match_id);
create index if not exists tactical_formations_team_idx on tactical_formations (team_id);

create or replace function set_updated_at_tactical_formations()
returns trigger as $$
begin
  new.updated_at = now();
  return new;
end;
$$ language plpgsql;

drop trigger if exists tactical_formations_set_updated_at on tactical_formations;
create trigger tactical_formations_set_updated_at
  before update on tactical_formations
  for each row execute procedure set_updated_at_tactical_formations();

-- ---------------------------------------------------------------------------
-- tactical_positions — one row per player placed on the pitch. Coordinates
-- are percentages (0-100) of pitch width/height, not pixels, so the same
-- data renders correctly at any screen size — this is what "never hardcode
-- layouts" means at the schema level: the layout IS the data.
-- ---------------------------------------------------------------------------
create table if not exists tactical_positions (
  id uuid primary key default gen_random_uuid(),
  tactical_formation_id uuid not null references tactical_formations(id) on delete cascade,
  player_id uuid not null references players(id) on delete cascade,
  tactical_position text not null,
  x_coordinate numeric(5, 2) not null check (x_coordinate >= 0 and x_coordinate <= 100),
  y_coordinate numeric(5, 2) not null check (y_coordinate >= 0 and y_coordinate <= 100),
  shirt_number int not null,
  captain boolean not null default false,
  goalkeeper boolean not null default false,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (tactical_formation_id, player_id)
);

create index if not exists tactical_positions_formation_idx on tactical_positions (tactical_formation_id);
create index if not exists tactical_positions_player_idx on tactical_positions (player_id);

drop trigger if exists tactical_positions_set_updated_at on tactical_positions;
create trigger tactical_positions_set_updated_at
  before update on tactical_positions
  for each row execute procedure set_updated_at_tactical_formations();

-- Same RLS posture as every other table in this project: enabled, no public
-- policies. All access goes through the service-role client from
-- app/live/[matchId]/formation/actions.ts, gated by requireRole(["admin",
-- "super_admin", "broadcast_operator"]) — the same gate as the rest of the
-- Broadcast Control Center. Never reachable from the Coach Portal, the
-- public site, or any public API route.
alter table tactical_formations enable row level security;
alter table tactical_positions enable row level security;
