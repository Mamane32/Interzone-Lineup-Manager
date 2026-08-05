-- ============================================================================
-- GGSP Production Polish — configurable platform branding
-- ============================================================================
-- Additive only. Nothing existing is altered, renamed, or dropped.
--
-- Today the GG header (Broadcast Control Center, admin/coach shell) reads
-- "GoodGrafik" / "Sports Platform" from NEXT_PUBLIC_BROADCAST_ORG_NAME env
-- vars with hardcoded fallbacks baked into components/brand/BrandMark.tsx —
-- changing it required a code deploy. This table is the single row of
-- truth instead: one admin-editable record, read by lib/branding.ts's
-- getPlatformBranding(), with the exact same hardcoded strings as its
-- in-code fallback if the row is ever missing (never a blank header).
--
-- Deliberately a real singleton, not just "the first row": `id` is
-- constrained to the literal value `true`, so a second insert can never
-- happen — there is exactly one platform, so there is exactly one row.
create table if not exists platform_branding (
  id boolean primary key default true,
  organization_name text not null default 'GoodGrafik',
  organization_subtitle text not null default 'Sports Platform',
  organization_logo_url text,
  primary_color text not null default '#f5a623',
  secondary_color text not null default '#0d1117',
  updated_at timestamptz not null default now(),
  constraint platform_branding_is_singleton check (id)
);

insert into platform_branding (id)
values (true)
on conflict (id) do nothing;

-- Same posture as every other table (supabase/schema.sql): RLS on, no
-- public policies — only the service-role client (lib/supabase-admin.ts)
-- ever reads or writes this.
alter table platform_branding enable row level security;

drop trigger if exists platform_branding_set_updated_at on platform_branding;
create trigger platform_branding_set_updated_at
  before update on platform_branding
  for each row execute procedure set_updated_at();
