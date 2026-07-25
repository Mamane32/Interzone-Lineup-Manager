-- ============================================================================
-- INTERZONE LINEUP MANAGER — SCHEMA
-- ============================================================================
-- All application access happens server-side (Next.js Server Components /
-- Server Actions) using the Supabase service role key, so Row Level Security
-- is enabled on every table with NO public policies. Nothing is reachable
-- directly from the browser. Coaches never authenticate — their identity is
-- the unguessable `token` on the teams row, checked in server code.

create extension if not exists "pgcrypto";

-- ---------------------------------------------------------------------------
-- COMPETITIONS
-- ---------------------------------------------------------------------------
create table competitions (
  id uuid primary key default gen_random_uuid(),
  name text not null,
  created_at timestamptz not null default now()
);

-- ---------------------------------------------------------------------------
-- TEAMS
-- ---------------------------------------------------------------------------
create table teams (
  id uuid primary key default gen_random_uuid(),
  competition_id uuid references competitions(id) on delete set null,
  name text not null,
  logo_url text,
  coach_name text not null,
  coach_phone text not null,
  coach_email text,
  token text not null unique,
  created_at timestamptz not null default now()
);

create index teams_token_idx on teams (token);
create index teams_competition_idx on teams (competition_id);

-- ---------------------------------------------------------------------------
-- PLAYERS (per team squad list)
-- ---------------------------------------------------------------------------
create table players (
  id uuid primary key default gen_random_uuid(),
  team_id uuid not null references teams(id) on delete cascade,
  number int not null,
  full_name text not null,
  created_at timestamptz not null default now(),
  unique (team_id, number)
);

create index players_team_idx on players (team_id);

-- ---------------------------------------------------------------------------
-- MATCHES
-- ---------------------------------------------------------------------------
create table matches (
  id uuid primary key default gen_random_uuid(),
  competition_id uuid references competitions(id) on delete set null,
  round text,
  home_team_id uuid not null references teams(id) on delete cascade,
  away_team_id uuid not null references teams(id) on delete cascade,
  match_date date not null,
  match_time time not null,
  created_at timestamptz not null default now(),
  check (home_team_id <> away_team_id)
);

create index matches_competition_idx on matches (competition_id);

-- ---------------------------------------------------------------------------
-- LINEUPS
-- One row per (match, team) — this is what the coach fills in and what the
-- admin reviews / exports. Player order in the arrays is the display order.
-- ---------------------------------------------------------------------------
create type lineup_status as enum ('waiting', 'submitted', 'needs_correction');

create table lineups (
  id uuid primary key default gen_random_uuid(),
  match_id uuid not null references matches(id) on delete cascade,
  team_id uuid not null references teams(id) on delete cascade,
  status lineup_status not null default 'waiting',
  starting_xi uuid[] not null default '{}',      -- ordered array of player ids, length 11 when submitted
  substitutes uuid[] not null default '{}',       -- ordered array of player ids, length up to 9
  captain_id uuid references players(id),
  remarks text,
  locked boolean not null default false,
  submitted_at timestamptz,
  updated_at timestamptz not null default now(),
  unique (match_id, team_id)
);

create index lineups_match_idx on lineups (match_id);
create index lineups_team_idx on lineups (team_id);

-- keep updated_at fresh
create or replace function set_updated_at()
returns trigger as $$
begin
  new.updated_at = now();
  return new;
end;
$$ language plpgsql;

create trigger lineups_set_updated_at
  before update on lineups
  for each row execute procedure set_updated_at();

-- ---------------------------------------------------------------------------
-- Auto-create a `lineups` row (status = waiting) for both teams whenever a
-- match is created, so the admin dashboard has something to show immediately.
-- ---------------------------------------------------------------------------
create or replace function create_lineups_for_match()
returns trigger as $$
begin
  insert into lineups (match_id, team_id) values (new.id, new.home_team_id);
  insert into lineups (match_id, team_id) values (new.id, new.away_team_id);
  return new;
end;
$$ language plpgsql;

create trigger matches_create_lineups
  after insert on matches
  for each row execute procedure create_lineups_for_match();

-- ---------------------------------------------------------------------------
-- Row Level Security — locked down, server-only access via service role.
-- ---------------------------------------------------------------------------
alter table competitions enable row level security;
alter table teams enable row level security;
alter table players enable row level security;
alter table matches enable row level security;
alter table lineups enable row level security;

-- No policies are created, so no anon/authenticated client can read or write
-- any of these tables directly. The service role key bypasses RLS by design
-- and is only ever used from trusted server code.

-- ---------------------------------------------------------------------------
-- Storage bucket for team logos (public read, uploads via service role only)
-- ---------------------------------------------------------------------------
insert into storage.buckets (id, name, public)
values ('team-logos', 'team-logos', true)
on conflict (id) do nothing;
