-- ============================================================================
-- GGSP / INTERZONE LINEUP MANAGER — CONSOLIDATED CURRENT SCHEMA
-- ============================================================================
-- Regenerated as part of Sprint 1 Closure (Enterprise Readiness Review,
-- High Finding #5) to reflect the schema as it actually exists today — not
-- just the Sprint 1 baseline. This file documents the FINAL state of every
-- table after migrations 002-007 have all applied (base tables and
-- `alter table` additions merged together per table), so a reviewer can
-- read one file instead of replaying seven.
--
-- This is a reference, not an executable migration runner: the numbered
-- files in supabase/migrations/ (and their guarded counterparts in
-- supabase/deploy/packages/) remain the actual, authoritative,
-- run-in-order history and the only thing that should ever be executed
-- against a real database. If this file and the migrations ever disagree,
-- the migrations are correct and this file is stale — regenerate it.
--
-- AUTHORIZATION MODEL (unchanged since Sprint 1, re-affirmed in Sprint 1
-- Closure — see SECURITY_AUTHORIZATION_MODEL.md for the full reasoning):
-- every table below has Row Level Security ENABLED with NO public policies.
-- All application access goes through the Supabase SERVICE ROLE key
-- (lib/supabase-admin.ts) from trusted server code only; nothing is
-- reachable directly from the browser. Coaches never get a Supabase Auth
-- password by default — their identity is the unguessable `token` on the
-- teams row (an email+password upgrade exists per-team, opt-in).

create extension if not exists "pgcrypto";

-- ============================================================================
-- ENUM TYPES
-- ============================================================================
create type lineup_status as enum ('waiting', 'submitted', 'needs_correction');
create type match_live_status as enum (
  'pre_match', 'kickoff', 'first_half', 'half_time', 'second_half',
  'extra_time', 'penalty_shootout', 'full_time'
);
create type match_event_type as enum (
  'goal', 'penalty_goal', 'own_goal', 'yellow_card', 'second_yellow',
  'red_card', 'substitution', 'var', 'penalty_missed', 'injury',
  'match_start', 'half_time', 'match_resume', 'match_end'
);
create type access_status as enum ('invited', 'active', 'suspended', 'disabled');
create type platform_role as enum (
  'super_admin', 'admin', 'competition_manager', 'broadcast_operator',
  'coach', 'referee', 'media', 'viewer'
);
create type invitation_status as enum ('pending', 'accepted', 'expired', 'revoked');
create type foundation_status as enum ('active', 'archived');
create type competition_type as enum (
  'league', 'cup', 'knockout', 'round_robin', 'league_playoffs',
  'group_knockout', 'friendly_tournament', 'custom'
);
create type competition_gender as enum ('male', 'female', 'mixed', 'open');
create type stage_type as enum (
  'regular_season', 'group_stage', 'knockout', 'quarterfinal',
  'semifinal', 'third_place', 'final', 'custom'
);
create type venue_surface_type as enum ('grass', 'artificial_turf', 'hybrid', 'other');
create type formation_name as enum (
  '4-4-2', '4-3-3', '3-5-2', '3-4-3', '4-2-3-1', '4-1-4-1', '5-3-2', '5-4-1', '4-5-1', 'custom'
);

-- ============================================================================
-- IDENTITY & ACCESS
-- ============================================================================

-- One row per auth.users entry granted platform access. Not auto-created on
-- signup — a profile + an active assignment together are what "this login
-- is allowed in" means.
create table if not exists profiles (
  id uuid primary key references auth.users(id) on delete cascade,
  email text not null,
  full_name text,
  avatar_url text,
  status access_status not null default 'active',
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

-- NOTE — dependency-order fix (staging bootstrap failure, `relation
-- "competitions" does not exist"): user_access_assignments and invitations
-- both carry foreign keys into competitions/teams (and
-- user_access_assignments also into invitations), so on a genuinely empty
-- database they cannot be created this early — competitions and teams
-- don't exist yet at this point in the file. Relocated below, after
-- TEAMS & PLAYERS, in dependency order (invitations before
-- user_access_assignments, since the latter now references the former).
-- Column/constraint/type/index/RLS content is unchanged — see those tables
-- further down for the actual definitions.

-- Append-only audit trail. RLS deny-all is not the real guarantee here (the
-- service-role client bypasses RLS by design) — the BEFORE UPDATE/DELETE
-- triggers below are what actually make this table immutable, for every
-- role including service_role, because this is a data-integrity rule, not
-- an authorization policy.
create table if not exists audit_logs (
  id uuid primary key default gen_random_uuid(),
  actor_user_id uuid references auth.users(id) on delete set null,
  action text not null,
  target_type text not null,
  target_id text,
  organization_id uuid,
  metadata jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now()
);

create index if not exists audit_logs_actor_idx on audit_logs (actor_user_id);
create index if not exists audit_logs_action_idx on audit_logs (action);
create index if not exists audit_logs_target_idx on audit_logs (target_type, target_id);
create index if not exists audit_logs_created_idx on audit_logs (created_at desc);

-- Display metadata for the platform_role enum. The enum itself stays the
-- source of truth for which roles exist; this only holds what the Roles
-- page renders (and lets an admin edit a description without a migration).
create table if not exists role_metadata (
  role_key platform_role primary key,
  name text not null,
  description text,
  is_system boolean not null default true,
  updated_at timestamptz not null default now()
);

-- ============================================================================
-- COMPETITION FOUNDATION
-- ============================================================================

-- Top of the hierarchy: organization -> competition -> season -> division
-- -> stage -> group. An organization (e.g. Interzone) is a row here, never
-- a hardcoded concept in schema or application code.
create table if not exists organizations (
  id uuid primary key default gen_random_uuid(),
  name text not null,
  short_name text,
  slug text not null unique,
  description text,
  logo_url text,
  banner_url text,
  primary_color text,
  secondary_color text,
  country text,
  city text,
  address text,
  phone text,
  email text,
  website text,
  timezone text,
  currency text,
  status foundation_status not null default 'active',
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index if not exists organizations_status_idx on organizations (status);

create table if not exists competitions (
  id uuid primary key default gen_random_uuid(),
  organization_id uuid references organizations(id) on delete set null,
  name text not null,
  short_name text,
  slug text,
  description text,
  logo_url text,
  competition_type competition_type,
  sport text not null default 'football',
  gender competition_gender,
  age_category text,
  timezone text,
  match_duration int not null default 90,
  halftime_duration int not null default 15,
  extra_time_enabled boolean not null default false,
  penalties_enabled boolean not null default false,
  points_win int not null default 3,
  points_draw int not null default 1,
  points_loss int not null default 0,
  status foundation_status not null default 'active',
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

-- Slug uniqueness is scoped per organization (multi-tenant), not global;
-- rows with a NULL organization_id (pre-org-foundation competitions, until
-- assigned one) are exempt since Postgres treats NULL as distinct.
create unique index if not exists competitions_org_slug_idx
  on competitions (organization_id, slug)
  where organization_id is not null and slug is not null;

create index if not exists competitions_organization_idx on competitions (organization_id);
create index if not exists competitions_status_idx on competitions (status);

-- Exactly one 'active' season per competition — a real database constraint
-- (partial unique index), not just application-level discipline.
create table if not exists seasons (
  id uuid primary key default gen_random_uuid(),
  competition_id uuid not null references competitions(id) on delete cascade,
  name text not null,
  year int,
  registration_start date,
  registration_end date,
  season_start date,
  season_end date,
  status foundation_status not null default 'active',
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index if not exists seasons_competition_idx on seasons (competition_id);
create unique index if not exists seasons_one_active_per_competition
  on seasons (competition_id) where status = 'active';

create table if not exists divisions (
  id uuid primary key default gen_random_uuid(),
  season_id uuid not null references seasons(id) on delete cascade,
  name text not null,
  abbreviation text,
  display_order int not null default 0,
  status foundation_status not null default 'active',
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index if not exists divisions_season_idx on divisions (season_id);

create table if not exists stages (
  id uuid primary key default gen_random_uuid(),
  division_id uuid not null references divisions(id) on delete cascade,
  name text not null,
  stage_type stage_type,
  display_order int not null default 0,
  status foundation_status not null default 'active',
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index if not exists stages_division_idx on stages (division_id);

-- Named competition_groups (not "groups") to avoid the reserved SQL word.
create table if not exists competition_groups (
  id uuid primary key default gen_random_uuid(),
  stage_id uuid not null references stages(id) on delete cascade,
  name text not null,
  display_order int not null default 0,
  status foundation_status not null default 'active',
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index if not exists competition_groups_stage_idx on competition_groups (stage_id);

-- Belongs to an organization, not a competition — reusable across
-- competitions. Not yet referenced by matches (planned, not built).
create table if not exists venues (
  id uuid primary key default gen_random_uuid(),
  organization_id uuid references organizations(id) on delete set null,
  name text not null,
  short_name text,
  slug text,
  address text,
  city text,
  country text,
  gps_latitude numeric,
  gps_longitude numeric,
  capacity int,
  surface_type venue_surface_type,
  lighting boolean not null default false,
  home_team_supported boolean not null default true,
  google_maps_url text,
  photo_url text,
  status foundation_status not null default 'active',
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create unique index if not exists venues_org_slug_idx
  on venues (organization_id, slug)
  where organization_id is not null and slug is not null;

create index if not exists venues_organization_idx on venues (organization_id);
create index if not exists venues_status_idx on venues (status);

-- ============================================================================
-- TEAMS & PLAYERS
-- ============================================================================

create table if not exists teams (
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

create index if not exists teams_token_idx on teams (token);
create index if not exists teams_competition_idx on teams (competition_id);

create table if not exists players (
  id uuid primary key default gen_random_uuid(),
  team_id uuid not null references teams(id) on delete cascade,
  number int not null,
  full_name text not null,
  created_at timestamptz not null default now(),
  unique (team_id, number)
);

create index if not exists players_team_idx on players (team_id);

-- ============================================================================
-- IDENTITY & ACCESS — SCOPED GRANTS
-- ============================================================================
-- Relocated from the IDENTITY & ACCESS section above — both tables carry
-- foreign keys into competitions/teams (created just above, in COMPETITION
-- FOUNDATION and TEAMS & PLAYERS), so they must be created after those
-- tables exist. invitations comes first here because
-- user_access_assignments references it. No column, constraint, type,
-- index, or RLS content differs from the original definitions.

-- Real, admin-visible invite record, separate from the raw Supabase Auth
-- invite call. auth.users is the actual credential store, untouched here.
create table if not exists invitations (
  id uuid primary key default gen_random_uuid(),
  email text not null,
  full_name text,
  role_key platform_role not null,
  competition_id uuid references competitions(id) on delete set null,
  team_id uuid references teams(id) on delete set null,
  status invitation_status not null default 'pending',
  message text,
  invited_by uuid references auth.users(id) on delete set null,
  invited_user_id uuid references auth.users(id) on delete set null,
  accepted_user_id uuid references auth.users(id) on delete set null,
  expires_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index if not exists invitations_email_idx on invitations (lower(email));
create index if not exists invitations_status_idx on invitations (status);

-- One row per role grant. Single unified table (not roles + user_roles) —
-- competition_id/team_id are the only scope dimensions in use today.
create table if not exists user_access_assignments (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  role_key platform_role not null,
  competition_id uuid references competitions(id) on delete cascade,
  team_id uuid references teams(id) on delete cascade,
  status access_status not null default 'active',
  invitation_id uuid references invitations(id) on delete set null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (user_id, role_key, team_id)
);

create index if not exists user_access_assignments_user_idx on user_access_assignments (user_id);
create index if not exists user_access_assignments_team_idx on user_access_assignments (team_id);
create index if not exists user_access_assignments_invitation_idx on user_access_assignments (invitation_id);

-- ============================================================================
-- MATCHES, EVENTS & LINEUPS
-- ============================================================================

create table if not exists matches (
  id uuid primary key default gen_random_uuid(),
  competition_id uuid references competitions(id) on delete set null,
  round text,
  home_team_id uuid not null references teams(id) on delete cascade,
  away_team_id uuid not null references teams(id) on delete cascade,
  match_date date not null,
  match_time time not null,
  live_status match_live_status not null default 'pre_match',
  home_score int not null default 0,
  away_score int not null default 0,
  referee_name text,
  venue text,
  created_at timestamptz not null default now(),
  check (home_team_id <> away_team_id)
);

create index if not exists matches_competition_idx on matches (competition_id);

-- Timeline backbone for the Broadcast Center, Highlights Index, and Match
-- Report. `minute` is text (not int) to support stoppage-time notation
-- like "45+2".
create table if not exists match_events (
  id uuid primary key default gen_random_uuid(),
  match_id uuid not null references matches(id) on delete cascade,
  minute text not null,
  type match_event_type not null,
  team_id uuid references teams(id) on delete set null,
  player_id uuid references players(id) on delete set null,
  description text,
  created_at timestamptz not null default now()
);

create index if not exists match_events_match_idx on match_events (match_id);
create index if not exists match_events_type_idx on match_events (type);

-- One row per (match, team) — what the coach fills in, what admin reviews.
-- A `lineups` row is auto-created (status='waiting') for both teams
-- whenever a match is created.
create table if not exists lineups (
  id uuid primary key default gen_random_uuid(),
  match_id uuid not null references matches(id) on delete cascade,
  team_id uuid not null references teams(id) on delete cascade,
  status lineup_status not null default 'waiting',
  starting_xi uuid[] not null default '{}',
  substitutes uuid[] not null default '{}',
  captain_id uuid references players(id),
  remarks text,
  locked boolean not null default false,
  submitted_at timestamptz,
  updated_at timestamptz not null default now(),
  unique (match_id, team_id)
);

create index if not exists lineups_match_idx on lineups (match_id);
create index if not exists lineups_team_idx on lineups (team_id);

-- ============================================================================
-- TACTICAL FORMATION PANEL
-- ============================================================================

-- One formation per (match, team). Re-saving overwrites, it does not
-- create a second one (see the unique index).
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

-- One row per player placed on the pitch. Coordinates are percentages
-- (0-100) of pitch width/height, not pixels, so the same data renders
-- correctly at any screen size.
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

-- ============================================================================
-- ROW LEVEL SECURITY
-- ============================================================================
-- Enabled on every table above, zero public policies on any of them — see
-- the authorization model note at the top of this file.

alter table profiles enable row level security;
alter table user_access_assignments enable row level security;
alter table invitations enable row level security;
alter table audit_logs enable row level security;
alter table role_metadata enable row level security;
alter table organizations enable row level security;
alter table competitions enable row level security;
alter table seasons enable row level security;
alter table divisions enable row level security;
alter table stages enable row level security;
alter table competition_groups enable row level security;
alter table venues enable row level security;
alter table teams enable row level security;
alter table players enable row level security;
alter table matches enable row level security;
alter table match_events enable row level security;
alter table lineups enable row level security;
alter table tactical_formations enable row level security;
alter table tactical_positions enable row level security;

-- ============================================================================
-- STORAGE
-- ============================================================================
insert into storage.buckets (id, name, public)
values ('team-logos', 'team-logos', true)
on conflict (id) do nothing;

-- ============================================================================
-- FUNCTIONS & TRIGGERS
-- ============================================================================
-- One shared updated_at trigger function, reused by every table with an
-- updated_at column (the migrations created a few differently-named
-- duplicates of this same function along the way — set_updated_at,
-- set_updated_at_profiles, set_updated_at_tactical_formations — all
-- functionally identical; consolidated to one here for this reference).

create or replace function set_updated_at()
returns trigger as $$
begin
  new.updated_at = now();
  return new;
end;
$$ language plpgsql;

create trigger profiles_set_updated_at before update on profiles for each row execute procedure set_updated_at();
create trigger user_access_assignments_set_updated_at before update on user_access_assignments for each row execute procedure set_updated_at();
create trigger invitations_set_updated_at before update on invitations for each row execute procedure set_updated_at();
create trigger role_metadata_set_updated_at before update on role_metadata for each row execute procedure set_updated_at();
create trigger organizations_set_updated_at before update on organizations for each row execute procedure set_updated_at();
create trigger competitions_set_updated_at before update on competitions for each row execute procedure set_updated_at();
create trigger seasons_set_updated_at before update on seasons for each row execute procedure set_updated_at();
create trigger divisions_set_updated_at before update on divisions for each row execute procedure set_updated_at();
create trigger stages_set_updated_at before update on stages for each row execute procedure set_updated_at();
create trigger competition_groups_set_updated_at before update on competition_groups for each row execute procedure set_updated_at();
create trigger venues_set_updated_at before update on venues for each row execute procedure set_updated_at();
create trigger lineups_set_updated_at before update on lineups for each row execute procedure set_updated_at();
create trigger tactical_formations_set_updated_at before update on tactical_formations for each row execute procedure set_updated_at();
create trigger tactical_positions_set_updated_at before update on tactical_positions for each row execute procedure set_updated_at();

-- Auto-create a `lineups` row (status = waiting) for both teams whenever a
-- match is created.
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

-- Real, DB-enforced append-only audit log — fires for every role including
-- service_role, because it's a data-integrity rule, not an authorization
-- policy (RLS cannot make this guarantee against the app's own service-role
-- client; a trigger can).
create or replace function reject_audit_log_mutation()
returns trigger as $$
begin
  raise exception 'audit_logs is append-only: % is not permitted', TG_OP;
end;
$$ language plpgsql;

create trigger audit_logs_no_update before update on audit_logs for each row execute procedure reject_audit_log_mutation();
create trigger audit_logs_no_delete before delete on audit_logs for each row execute procedure reject_audit_log_mutation();

-- ============================================================================
-- SEED DATA
-- ============================================================================
insert into role_metadata (role_key, name, description, is_system) values
  ('super_admin', 'Super Administrator', 'Full platform access, including Identity & Access Management.', true),
  ('admin', 'Administrator', 'Manages competitions, teams, matches, lineups, and platform users.', true),
  ('competition_manager', 'Competition Manager', 'Manages a specific competition''s structure and data.', true),
  ('broadcast_operator', 'Broadcast Operator', 'Operates the Broadcast Control Center for live matches.', true),
  ('coach', 'Coach', 'Manages one or more assigned teams'' lineups.', true),
  ('referee', 'Referee', 'Match officiating workspace (placeholder).', true),
  ('media', 'Media', 'Media/press workspace (placeholder).', true),
  ('viewer', 'Viewer', 'Read-only access, no assigned workspace.', true)
on conflict (role_key) do nothing;
