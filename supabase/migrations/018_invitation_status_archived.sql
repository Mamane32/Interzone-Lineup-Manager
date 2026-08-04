-- ============================================================================
-- SPRINT 3 PHASE 2 — Invitation Management Redesign (Item A)
-- ============================================================================
-- Additive only. Run AFTER 017_asset_buckets.sql. Nothing existing is
-- altered, renamed, or dropped.
--
-- The redesigned invitation lifecycle needs a real terminal state for
-- "this invitation's user was later archived" (Accepted -> Archived),
-- distinct from Revoked (which only ever applies pre-acceptance). App code
-- wiring lands in a separate, later deploy — Postgres forbids using a new
-- enum value in the same transaction that added it (same rule as
-- 011_additional_time_event.sql and 016_access_status_archived.sql).

alter type invitation_status add value if not exists 'archived';
