-- ============================================================================
-- SPRINT 3 PHASE 1 — Enterprise Authentication & Invitation Lifecycle
-- ============================================================================
-- Additive only. Run AFTER 015_match_statistics.sql. Nothing existing is
-- altered, renamed, or dropped.
--
-- app/admin/users/[userId]/page.tsx's "Archive" button has always called
-- updateUserStatus(userId, "archived"), but "archived" was never a real
-- access_status value — isAccessStatus() rejects it and the action has
-- always failed with "Invalid status value." This adds the value the
-- button was already trying to use. App code wiring (lib/types.ts,
-- lib/validation.ts, app/admin/users/actions.ts, StatusBadge) lands in a
-- separate, later deploy — Postgres forbids using a new enum value in the
-- same transaction that added it (same rule as 011_additional_time_event.sql).

alter type access_status add value if not exists 'archived';
