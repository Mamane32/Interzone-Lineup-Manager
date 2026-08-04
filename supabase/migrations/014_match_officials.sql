-- ============================================================================
-- SPRINT 3 — Live Match Experience: match officials
-- ============================================================================
-- Additive only. Run AFTER 013_production_queue.sql. Nothing existing is
-- altered, renamed, or dropped.
--
-- Per product decision: a match has one officiating crew, not reusable
-- entities — nullable columns on `matches`, not a separate table.
-- `referee_name` already exists (migration 002); these four are the rest
-- of a standard crew (two assistants, fourth official, VAR official).

alter table matches
  add column if not exists assistant_referee_1_name text,
  add column if not exists assistant_referee_2_name text,
  add column if not exists fourth_official_name text,
  add column if not exists var_official_name text;
