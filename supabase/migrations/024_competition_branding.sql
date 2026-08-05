-- ============================================================================
-- White-Label Branding System — Level 2 (Competition Administrator) branding
-- ============================================================================
-- Additive only. Nothing existing is altered, renamed, or dropped.
--
-- competitions already has name, short_name, logo_url (migration
-- 006_competition_foundation.sql) — this adds the remaining Level 2 fields
-- from the spec's "Allowed settings" list, plus a sponsor-logo gallery
-- (one competition can have many sponsors, so it's a child table, not a
-- column). Column names mirror lib/theme-tokens.ts's LEVEL_2_TOKENS
-- registry exactly.
--
-- Isolation guarantee (per spec, "Multi-tenant ready"): every column here
-- lives on the competitions row itself, so a change to one competition's
-- branding can only ever affect that row. Nothing in this migration reads
-- or writes platform_branding, and nothing in platform_branding reads
-- these columns — the two levels share no storage.

alter table competitions add column if not exists season_label text;
alter table competitions add column if not exists banner_url text;
alter table competitions add column if not exists theme_color text;
alter table competitions add column if not exists accent_color text;
alter table competitions add column if not exists background_image_url text;
alter table competitions add column if not exists intro_video_url text;
alter table competitions add column if not exists watermark_url text;

-- Sponsor logo gallery — "Competition Sponsor Logos" (plural) in the spec.
-- Scoped strictly to one competition via competition_id; deleting a
-- competition cascades its sponsor logos, never the reverse.
create table if not exists competition_sponsor_logos (
  id uuid primary key default gen_random_uuid(),
  competition_id uuid not null references competitions(id) on delete cascade,
  sponsor_name text,
  logo_url text not null,
  sort_order integer not null default 0,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index if not exists competition_sponsor_logos_competition_id_idx
  on competition_sponsor_logos(competition_id);

alter table competition_sponsor_logos enable row level security;

drop trigger if exists competition_sponsor_logos_set_updated_at on competition_sponsor_logos;
create trigger competition_sponsor_logos_set_updated_at
  before update on competition_sponsor_logos
  for each row execute procedure set_updated_at();
