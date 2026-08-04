-- ============================================================================
-- SPRINT 3 — ASSET PLATFORM PHASE 1: new storage buckets
-- ============================================================================
-- Additive only. Run AFTER 016_access_status_archived.sql. Nothing existing
-- is altered, renamed, or dropped.
--
-- Storage-only phase: creates buckets to import into. Deliberately does NOT
-- add a sponsors table, an officials table, or any admin CRUD for them —
-- that's explicitly scoped as a later phase, once the data model for those
-- entities is designed. No new column references any of these buckets yet.
--
-- competition-assets is broader than the existing competition-logos bucket
-- (competitions.logo_url) — general competition-level graphics (banners,
-- overlays, etc.) beyond the single primary logo, the same relationship
-- organization-logos has to organization-banners.

insert into storage.buckets (id, name, public)
values
  ('competition-assets', 'competition-assets', true),
  ('sponsor-logos', 'sponsor-logos', true),
  ('official-photos', 'official-photos', true)
on conflict (id) do nothing;
