-- ============================================================================
-- SPRINT 2 PHASE 4 — Image Upload Standard
-- ============================================================================
-- Additive only. Run AFTER 011_additional_time_event.sql. Nothing existing is
-- altered, renamed, or dropped.
--
-- No new columns — organizations.logo_url/banner_url, competitions.logo_url,
-- venues.photo_url, and profiles.avatar_url already exist and already store
-- a plain URL string; only how that string gets there changes (a real
-- upload via ImageUpload, not a pasted URL). team-logos and coach-photos
-- buckets already exist (schema.sql, migration 010) and are reused as-is.
-- Public read, same as every existing image bucket — writes only ever
-- happen via the service-role client from a trusted Server Action.

insert into storage.buckets (id, name, public)
values
  ('organization-logos', 'organization-logos', true),
  ('organization-banners', 'organization-banners', true),
  ('competition-logos', 'competition-logos', true),
  ('venue-photos', 'venue-photos', true),
  ('user-avatars', 'user-avatars', true)
on conflict (id) do nothing;
