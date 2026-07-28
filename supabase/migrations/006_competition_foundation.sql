-- ============================================================================
-- SPRINT 2.0 ENTERPRISE — COMPETITION & ORGANIZATION FOUNDATION
-- ============================================================================
-- Additive only. Run AFTER 005_iam_hardening.sql. The existing `competitions`
-- table is EXTENDED (new nullable columns) rather than replaced — it's
-- already referenced by teams, matches, user_access_assignments, and
-- invitations, all via nullable/on-delete-set-null foreign keys, so this is
-- safe on an existing database. No existing row's data changes.

create type foundation_status as enum ('active', 'archived');

-- ---------------------------------------------------------------------------
-- organizations — the new top of the hierarchy. Interzone becomes one row
-- here, not a hardcoded concept anywhere in the schema or application code.
-- ---------------------------------------------------------------------------
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

create trigger organizations_set_updated_at
  before update on organizations
  for each row execute procedure set_updated_at_profiles();

-- ---------------------------------------------------------------------------
-- competitions — EXTENDED, not replaced. Every new column is nullable or
-- has a safe default, so every existing competition row remains valid.
-- ---------------------------------------------------------------------------
create type competition_type as enum (
  'league',
  'cup',
  'knockout',
  'round_robin',
  'league_playoffs',
  'group_knockout',
  'friendly_tournament',
  'custom'
);

create type competition_gender as enum ('male', 'female', 'mixed', 'open');

alter table competitions
  add column if not exists organization_id uuid references organizations(id) on delete set null,
  add column if not exists short_name text,
  add column if not exists slug text,
  add column if not exists description text,
  add column if not exists logo_url text,
  add column if not exists competition_type competition_type,
  add column if not exists sport text not null default 'football',
  add column if not exists gender competition_gender,
  add column if not exists age_category text,
  add column if not exists timezone text,
  add column if not exists match_duration int not null default 90,
  add column if not exists halftime_duration int not null default 15,
  add column if not exists extra_time_enabled boolean not null default false,
  add column if not exists penalties_enabled boolean not null default false,
  add column if not exists points_win int not null default 3,
  add column if not exists points_draw int not null default 1,
  add column if not exists points_loss int not null default 0,
  add column if not exists status foundation_status not null default 'active',
  add column if not exists updated_at timestamptz not null default now();

-- Slug uniqueness is scoped per organization, not global (this is a
-- multi-tenant platform) — competitions with a NULL organization_id (the
-- pre-existing ones, until an admin assigns them one) are exempt, since
-- Postgres treats NULL as distinct in a unique index and nothing here
-- should force a data migration on rows this sprint didn't create.
create unique index if not exists competitions_org_slug_idx
  on competitions (organization_id, slug)
  where organization_id is not null and slug is not null;

create index if not exists competitions_organization_idx on competitions (organization_id);
create index if not exists competitions_status_idx on competitions (status);

drop trigger if exists competitions_set_updated_at on competitions;
create trigger competitions_set_updated_at
  before update on competitions
  for each row execute procedure set_updated_at_profiles();

-- ---------------------------------------------------------------------------
-- seasons — exactly one 'active' season per competition, enforced by a
-- partial unique index (the actual database constraint, not just
-- application-level discipline).
-- ---------------------------------------------------------------------------
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
  on seasons (competition_id)
  where status = 'active';

create trigger seasons_set_updated_at
  before update on seasons
  for each row execute procedure set_updated_at_profiles();

-- ---------------------------------------------------------------------------
-- divisions
-- ---------------------------------------------------------------------------
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

create trigger divisions_set_updated_at
  before update on divisions
  for each row execute procedure set_updated_at_profiles();

-- ---------------------------------------------------------------------------
-- stages
-- ---------------------------------------------------------------------------
create type stage_type as enum (
  'regular_season',
  'group_stage',
  'knockout',
  'quarterfinal',
  'semifinal',
  'third_place',
  'final',
  'custom'
);

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

create trigger stages_set_updated_at
  before update on stages
  for each row execute procedure set_updated_at_profiles();

-- ---------------------------------------------------------------------------
-- competition_groups — named to avoid the reserved SQL word "group"
-- ---------------------------------------------------------------------------
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

create trigger competition_groups_set_updated_at
  before update on competition_groups
  for each row execute procedure set_updated_at_profiles();

-- ---------------------------------------------------------------------------
-- venues — belongs to an organization, not a competition. Matches will
-- reference this table in a future sprint; not created yet, per the brief.
-- ---------------------------------------------------------------------------
create type venue_surface_type as enum ('grass', 'artificial_turf', 'hybrid', 'other');

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

create trigger venues_set_updated_at
  before update on venues
  for each row execute procedure set_updated_at_profiles();

-- ---------------------------------------------------------------------------
-- Row Level Security — same posture as every table since Sprint 1.2:
-- enabled, zero public policies. All access via the service-role client
-- from trusted server helpers (lib/foundation.ts), gated by requireRole()
-- (super_admin / admin / competition_manager only, per the brief).
-- ---------------------------------------------------------------------------
alter table organizations enable row level security;
alter table seasons enable row level security;
alter table divisions enable row level security;
alter table stages enable row level security;
alter table competition_groups enable row level security;
alter table venues enable row level security;
-- competitions already had RLS enabled with no policies since schema.sql.
