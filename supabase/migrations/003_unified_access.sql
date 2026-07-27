-- ============================================================================
-- SPRINT 1.2 — UNIFIED PORTAL AUTHENTICATION & ROLE-BASED ACCESS
-- ============================================================================
-- Additive only. Two new tables, nothing existing is altered. Run this
-- AFTER supabase/schema.sql and supabase/migrations/002_live_center.sql.
--
-- IMPORTANT DEPLOYMENT ORDER: run this migration AND the admin bootstrap
-- grant (see the commented block at the bottom, and DEPLOYMENT_CHECKLIST.md)
-- BEFORE deploying the application code from this sprint. The new code adds
-- a real role check to /admin (previously any authenticated user could
-- reach it — see SPRINT_1_2_UNIFIED_AUTH.md for why). If the code ships
-- before your administrator has an 'admin' row in user_access_assignments,
-- they will be locked out until you run the bootstrap grant below.

-- ---------------------------------------------------------------------------
-- profiles — one row per auth.users entry that has been granted platform
-- access. Not auto-created on signup; a profile + assignment together are
-- what "this login is allowed in" means in this system.
-- ---------------------------------------------------------------------------
create type access_status as enum ('invited', 'active', 'suspended', 'disabled');

create table if not exists profiles (
  id uuid primary key references auth.users(id) on delete cascade,
  email text not null,
  full_name text,
  avatar_url text,
  status access_status not null default 'active',
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create or replace function set_updated_at_profiles()
returns trigger as $$
begin
  new.updated_at = now();
  return new;
end;
$$ language plpgsql;

create trigger profiles_set_updated_at
  before update on profiles
  for each row execute procedure set_updated_at_profiles();

-- ---------------------------------------------------------------------------
-- user_access_assignments — one row per grant. A single unified table
-- (rather than a separate roles + user_roles pair) because this platform
-- has no organizations/seasons tables yet to scope against — competition
-- and team are the only real scope dimensions that exist today. If
-- organizations/seasons are added later, this table gains nullable columns
-- for them; it does not need to be redesigned.
-- ---------------------------------------------------------------------------
create type platform_role as enum (
  'super_admin',
  'admin',
  'competition_manager',
  'broadcast_operator',
  'coach',
  'referee',
  'media',
  'viewer'
);

create table if not exists user_access_assignments (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  role_key platform_role not null,
  competition_id uuid references competitions(id) on delete cascade,
  team_id uuid references teams(id) on delete cascade,
  status access_status not null default 'active',
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index if not exists user_access_assignments_user_idx on user_access_assignments (user_id);
create index if not exists user_access_assignments_team_idx on user_access_assignments (team_id);

-- Lets admin/teams/[id]/actions.ts's inviteCoach safely upsert (re-inviting
-- the same coach for the same team updates the existing grant instead of
-- creating a duplicate). Note: Postgres treats NULL team_id values as
-- distinct from each other, so this does not dedupe non-team-scoped roles
-- (admin, etc.) — those are granted manually via the bootstrap step below,
-- not through this upsert path, so that's not a practical issue.
alter table user_access_assignments
  add constraint user_access_assignments_unique_grant unique (user_id, role_key, team_id);

create trigger user_access_assignments_set_updated_at
  before update on user_access_assignments
  for each row execute procedure set_updated_at_profiles();

-- ---------------------------------------------------------------------------
-- Row Level Security — same posture as every other table in this project:
-- enabled, zero public policies. All reads/writes go through the
-- service-role client from trusted server helpers (lib/access.ts), exactly
-- like every other authorization check in this codebase (e.g.
-- lib/coach-auth.ts). This is a deliberate choice to stay consistent with
-- the established architecture rather than introduce a second enforcement
-- model (RLS policies) alongside the server-side checks that already do
-- this work everywhere else in the app.
-- ---------------------------------------------------------------------------
alter table profiles enable row level security;
alter table user_access_assignments enable row level security;

-- ---------------------------------------------------------------------------
-- One-time backfill: any team that already has a coach_email matching a
-- real Supabase Auth user gets a profile + a 'coach' assignment, so
-- existing invited coaches don't lose access when lib/coach-auth.ts starts
-- checking this table (it checks this table FIRST, falling back to the old
-- coach_email match — see SPRINT_1_2_UNIFIED_AUTH.md — so this backfill is
-- a safety net, not a hard requirement, but keeps both paths in sync).
-- ---------------------------------------------------------------------------
insert into profiles (id, email, status)
select u.id, u.email, 'active'
from auth.users u
join teams t on lower(t.coach_email) = lower(u.email)
on conflict (id) do nothing;

insert into user_access_assignments (user_id, role_key, team_id, competition_id, status)
select u.id, 'coach', t.id, t.competition_id, 'active'
from auth.users u
join teams t on lower(t.coach_email) = lower(u.email)
where not exists (
  select 1 from user_access_assignments a
  where a.user_id = u.id and a.role_key = 'coach' and a.team_id = t.id
);

-- ---------------------------------------------------------------------------
-- ADMIN BOOTSTRAP — required manual step, run once, before deploying this
-- sprint's application code. Replace the email below with your actual
-- administrator's email (the same one used at /admin/login), then run:
--
-- insert into profiles (id, email, status)
-- select id, email, 'active' from auth.users where email = 'admin@example.com'
-- on conflict (id) do nothing;
--
-- insert into user_access_assignments (user_id, role_key, status)
-- select id, 'admin', 'active' from auth.users where email = 'admin@example.com';
-- ---------------------------------------------------------------------------
