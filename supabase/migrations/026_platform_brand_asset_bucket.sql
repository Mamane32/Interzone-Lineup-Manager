-- ============================================================================
-- White-Label Branding System — Brand Studio asset storage
-- ============================================================================
-- Additive only. Nothing existing is altered, renamed, or dropped.
--
-- One bucket for all nine Level 1 logo/icon variants (Main, Small, Header,
-- Login, Loading, Splash, Favicon, Browser Icon, Placeholder) — each
-- variant is namespaced by its own folder (e.g. "main-logo/", "favicon/")
-- within this bucket via lib/image-upload.ts's entityId parameter, the
-- same pattern CoachPhoto/UserAvatar already use. Public, matching every
-- other logo/photo bucket in the app (competition-logos, team-logos, etc.)
-- — these are rendered on public-facing pages (login, broadcast output),
-- so there is nothing to keep private about them.

insert into storage.buckets (id, name, public)
values ('platform-brand-assets', 'platform-brand-assets', true)
on conflict (id) do nothing;
