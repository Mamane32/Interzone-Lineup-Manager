-- ============================================================================
-- SPRINT 2 — PHASE 4: MATCH OPERATIONS (Additional Time event type)
-- ============================================================================
-- Additive only. Run AFTER 010_coach_photo.sql. Nothing existing is
-- altered, renamed, or dropped.
--
-- Fixes a real bug found during the Phase 4 Broadcast Ecosystem Review:
-- the Quick Controls Bar's "Additional Time" shortcut was wired to the
-- exact same event type as "VAR" (both dispatched `type: "var"`), so
-- clicking it silently logged a VAR review instead of an additional-time
-- announcement. There was no existing match_event_type value that
-- actually meant "stoppage time added" — this adds the one that's
-- missing, rather than overloading an unrelated type.
--
-- Postgres allows adding a new enum value without touching existing rows
-- or any other value; this cannot run inside the same transaction as a
-- statement that uses the new value, but using it (only in application
-- code, in a later request) is unaffected.

alter type match_event_type add value if not exists 'additional_time';
