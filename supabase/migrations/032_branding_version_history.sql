-- ============================================================================
-- White-Label Branding System — Draft/Publish + Version History
-- ============================================================================
-- Additive only. One snapshot row per Publish of platform_branding — the
-- full resolved value set (every Level 1 token, keyed by token id) as
-- JSONB rather than one column per token, since this table's only job is
-- "what did the platform look like at this point in time," not a queryable
-- schema of its own. Enables restoring any previous publish's values back
-- into the Brand Studio's draft for review before re-publishing (never a
-- direct, un-reviewed overwrite — same "draft never affects production
-- until Publish is confirmed" rule as every other change).

create table if not exists platform_branding_versions (
  id uuid primary key default gen_random_uuid(),
  data jsonb not null,
  note text,
  published_by uuid references auth.users(id) on delete set null,
  published_at timestamptz not null default now()
);

create index if not exists platform_branding_versions_published_at_idx
  on platform_branding_versions (published_at desc);

alter table platform_branding_versions enable row level security;
