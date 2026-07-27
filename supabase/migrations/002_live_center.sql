-- ============================================================================
-- SPRINT 2 — BROADCAST CONTROL CENTER (LIVE CENTER)
-- ============================================================================
-- Additive only. Nothing here removes, renames, or alters the meaning of
-- any existing column, table, or row. Every new column has a safe default,
-- so this runs cleanly against a database that already has matches/lineups
-- in it. The Coach Portal (Sprint 1) does not read any of these new
-- columns/tables and is unaffected by this migration.
--
-- Run this AFTER supabase/schema.sql, in the Supabase SQL editor.

-- ---------------------------------------------------------------------------
-- Live match state — added directly to `matches` because a broadcast
-- control room needs a single source of truth for "what's the score and
-- status right now", and Score Control's "Manual Score Edit" requirement
-- means the score has to be a real, directly-editable field, not something
-- purely derived by counting timeline events.
-- ---------------------------------------------------------------------------
create type match_live_status as enum (
  'pre_match',
  'kickoff',
  'first_half',
  'half_time',
  'second_half',
  'extra_time',
  'penalty_shootout',
  'full_time'
);

alter table matches
  add column if not exists live_status match_live_status not null default 'pre_match',
  add column if not exists home_score int not null default 0,
  add column if not exists away_score int not null default 0,
  add column if not exists referee_name text,
  add column if not exists venue text;

-- `venue` is intentionally nullable and additive: the Coach Portal's
-- landing/dashboard pages already show a "Teren <Home Team>" placeholder
-- when no real venue is set (see SPRINT_1_COACH_PORTAL.md) — existing
-- matches with venue = null keep behaving exactly as before. Operators can
-- now optionally set a real venue (away grounds, cup finals, neutral sites)
-- from the Live Center, which the Coach Portal will prefer once set.

-- ---------------------------------------------------------------------------
-- Match timeline events — the backbone of the Timeline, Highlights Index,
-- and Match Report. `minute` is text (not int) to naturally support
-- stoppage-time notation like "45+2".
-- ---------------------------------------------------------------------------
create type match_event_type as enum (
  'goal',
  'penalty_goal',
  'own_goal',
  'yellow_card',
  'second_yellow',
  'red_card',
  'substitution',
  'var',
  'penalty_missed',
  'injury',
  'match_start',
  'half_time',
  'match_resume',
  'match_end'
);

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

-- Same RLS posture as every other table in this project: enabled, no public
-- policies. All access goes through the service-role client from trusted
-- server code (see lib/supabase-admin.ts).
alter table match_events enable row level security;
