-- ============================================================================
-- SPRINT 2 — COACH EXPERIENCE: coach photo upload
-- ============================================================================
-- Additive only. Run AFTER 009_formation_engine.sql. Nothing existing is
-- altered, renamed, or dropped.
--
-- A real file upload, not a URL text field — mirrors the existing
-- `team-logos` storage bucket pattern from schema.sql exactly (public
-- read, so the photo can be displayed anywhere in the app without a
-- signed URL; writes only ever happen via the service-role client from
-- trusted Server Actions, same as every other write in this project).

alter table teams
  add column if not exists coach_photo_url text;

insert into storage.buckets (id, name, public)
values ('coach-photos', 'coach-photos', true)
on conflict (id) do nothing;

-- No RLS changes needed — `teams` already has RLS enabled with no public
-- policies; this is one new nullable column on an already-locked-down
-- table, plus a public-read storage bucket consistent with team-logos.
