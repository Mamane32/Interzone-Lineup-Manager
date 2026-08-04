-- ============================================================================
-- SPRINT 3 — Live Match Experience: Match Statistics Engine
-- ============================================================================
-- Additive only. Run AFTER 014_match_officials.sql. Nothing existing is
-- altered, renamed, or dropped.
--
-- Per product decision: statistics are operator-driven (one-click +/-
-- during the match), never inferred from match_events — Yellow Cards and
-- Red Cards are counted here independently of the Timeline's own
-- yellow_card/red_card events, even though both exist. Deliberate, not an
-- oversight: "do not overload the event system" rules out deriving stats
-- from events, and this table is the one place all nine required
-- statistics live, counted the same way regardless of type.
--
-- One row per (match, team) — the same shape as `lineups`
-- (matches_create_lineups / create_lineups_for_match below), auto-created
-- for both teams the moment a match is created, so an operator never hits
-- a "no stats row yet" gap once a match exists.

create table if not exists match_statistics (
  id uuid primary key default gen_random_uuid(),
  match_id uuid not null references matches(id) on delete cascade,
  team_id uuid not null references teams(id) on delete cascade,
  possession_percent integer not null default 50 check (possession_percent between 0 and 100),
  shots integer not null default 0 check (shots >= 0),
  shots_on_target integer not null default 0 check (shots_on_target >= 0),
  corners integer not null default 0 check (corners >= 0),
  fouls integer not null default 0 check (fouls >= 0),
  offside integer not null default 0 check (offside >= 0),
  yellow_cards integer not null default 0 check (yellow_cards >= 0),
  red_cards integer not null default 0 check (red_cards >= 0),
  saves integer not null default 0 check (saves >= 0),
  -- Expected Goals: architecture only, per product decision — no
  -- calculation engine exists yet. Always null until one does; the
  -- column exists so the UI can render "-" today and a real number later
  -- with no schema change.
  expected_goals numeric(4,2),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (match_id, team_id)
);

create index if not exists match_statistics_match_idx on match_statistics (match_id);

alter table match_statistics enable row level security;

create trigger match_statistics_set_updated_at
  before update on match_statistics for each row execute procedure set_updated_at();

create or replace function create_match_statistics_for_match()
returns trigger as $$
begin
  insert into match_statistics (match_id, team_id) values (new.id, new.home_team_id);
  insert into match_statistics (match_id, team_id) values (new.id, new.away_team_id);
  return new;
end;
$$ language plpgsql;

create trigger matches_create_match_statistics
  after insert on matches
  for each row execute procedure create_match_statistics_for_match();

-- Backfill: matches created before this migration existed have no
-- trigger-created rows yet. Idempotent — safe to re-run.
insert into match_statistics (match_id, team_id)
select id, home_team_id from matches
on conflict (match_id, team_id) do nothing;

insert into match_statistics (match_id, team_id)
select id, away_team_id from matches
on conflict (match_id, team_id) do nothing;
