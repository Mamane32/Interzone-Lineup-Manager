-- ============================================================================
-- SPRINT 1.3 — IDENTITY & ACCESS MANAGEMENT FOUNDATION
-- ============================================================================
-- Additive only. Run AFTER 002_live_center.sql and 003_unified_access.sql.
-- Nothing existing is altered, renamed, or dropped.

-- ---------------------------------------------------------------------------
-- invitations — a real, admin-visible record of every invite, separate
-- from the raw Supabase Auth invite call itself. This is what the
-- Invitations page lists/searches/resends/revokes; auth.users is the
-- actual credential store and is untouched by this table.
-- ---------------------------------------------------------------------------
create type invitation_status as enum ('pending', 'accepted', 'expired', 'revoked');

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
  accepted_user_id uuid references auth.users(id) on delete set null,
  expires_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index if not exists invitations_email_idx on invitations (lower(email));
create index if not exists invitations_status_idx on invitations (status);

create trigger invitations_set_updated_at
  before update on invitations
  for each row execute procedure set_updated_at_profiles();

-- ---------------------------------------------------------------------------
-- audit_logs — append-only. No update/delete policy for anyone; rows are
-- immutable once written. Metadata is jsonb so it can carry a small,
-- specific payload per action without needing a new column per event type.
-- Deliberately does NOT include organization_id as a real foreign key
-- (no organizations table exists yet) — kept as a plain nullable uuid for
-- forward compatibility, unvalidated until that table exists.
-- ---------------------------------------------------------------------------
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

-- ---------------------------------------------------------------------------
-- role_metadata — display metadata for the platform_role enum (name,
-- description, whether it's a built-in system role). The enum itself
-- stays the source of truth for which roles exist; this table only holds
-- what the Roles page needs to render and lets an admin edit a
-- description without a schema migration. Seeded with the 8 existing
-- roles below.
-- ---------------------------------------------------------------------------
create table if not exists role_metadata (
  role_key platform_role primary key,
  name text not null,
  description text,
  is_system boolean not null default true,
  updated_at timestamptz not null default now()
);

create trigger role_metadata_set_updated_at
  before update on role_metadata
  for each row execute procedure set_updated_at_profiles();

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

-- ---------------------------------------------------------------------------
-- Row Level Security — same posture as every other table: enabled, zero
-- public policies, all access via the service-role client from trusted
-- server helpers (lib/iam.ts). Consistent with profiles/
-- user_access_assignments from Sprint 1.2.
-- ---------------------------------------------------------------------------
alter table invitations enable row level security;
alter table audit_logs enable row level security;
alter table role_metadata enable row level security;

-- ============================================================================
-- FUTURE EXTENSION — full permission matrix (NOT created this sprint)
-- ============================================================================
-- Deliberately not applied. Role-based checks (lib/access.ts's
-- requireRole()) are the real enforcement mechanism everywhere in this app
-- today; building four empty tables with no UI reading them would be
-- scaffolding nothing uses. This is the exact DDL to run when a real
-- per-permission (not per-role) system becomes necessary — copy this block
-- into a new numbered migration at that time, don't uncomment it here.
--
-- create table permission_categories (
--   id uuid primary key default gen_random_uuid(),
--   key text not null unique,
--   name text not null,
--   description text,
--   sort_order int not null default 0,
--   created_at timestamptz not null default now()
-- );
--
-- create table permissions (
--   id uuid primary key default gen_random_uuid(),
--   category_id uuid references permission_categories(id) on delete cascade,
--   key text not null unique,
--   name text not null,
--   description text,
--   resource text not null,
--   action text not null,
--   created_at timestamptz not null default now()
-- );
--
-- create table role_permissions (
--   id uuid primary key default gen_random_uuid(),
--   role_key platform_role not null,
--   permission_id uuid not null references permissions(id) on delete cascade,
--   allowed boolean not null default true,
--   created_at timestamptz not null default now(),
--   unique (role_key, permission_id)
-- );
--
-- create table user_permissions (
--   id uuid primary key default gen_random_uuid(),
--   user_id uuid not null references auth.users(id) on delete cascade,
--   permission_id uuid not null references permissions(id) on delete cascade,
--   allowed boolean not null default true,
--   scope_type text,
--   scope_id uuid,
--   expires_at timestamptz,
--   created_at timestamptz not null default now()
-- );
--
-- Example seed permission keys (per the brief): users.view, users.invite,
-- users.edit, users.suspend, access.manage, roles.view, roles.manage,
-- competitions.manage, teams.manage, broadcast.access, lineups.manage,
-- reports.view.
