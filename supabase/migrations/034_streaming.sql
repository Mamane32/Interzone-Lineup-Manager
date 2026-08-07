-- ============================================================================
-- GGScoreLive Sprint 4 Phase 8 — Streaming Experience
-- ============================================================================
-- Additive only. Nothing existing is altered, renamed, or dropped.
--
-- `matches` already carries every other broadcast-adjacent field as a plain
-- nullable column (venue, referee_name, ... — migrations 002/014), not a
-- separate table, since a match has exactly one of each. A watch link is
-- the same shape: one match, one stream URL, so it follows the same
-- pattern instead of introducing a new entity.
--
-- `is_featured_broadcast` is a simple editorial flag (same idea as
-- news_articles.featured from Phase 4) an admin/broadcast operator sets
-- from the Live Center's existing "Edit venue & officials" panel
-- (components/live/MatchHeaderPanel.tsx) to pin a match to the public
-- Streaming Experience's Featured Broadcasts rail regardless of kickoff
-- time.

alter table matches
  add column if not exists stream_url text,
  add column if not exists is_featured_broadcast boolean not null default false;

create index if not exists matches_featured_broadcast_idx on matches (is_featured_broadcast) where is_featured_broadcast = true;
