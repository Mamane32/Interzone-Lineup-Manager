-- ============================================================================
-- GGScoreLive Sprint 4 Phase 4 — News Center
-- ============================================================================
-- Additive only. Nothing existing is altered, renamed, or dropped.

create table if not exists news_articles (
  id uuid primary key default gen_random_uuid(),
  slug text not null unique,
  title text not null,
  excerpt text,
  body text not null default '',
  cover_image_url text,
  category text not null default 'general',
  featured boolean not null default false,
  status text not null default 'draft',
  competition_id uuid references competitions(id) on delete set null,
  author_name text,
  published_at timestamptz,
  created_by uuid references auth.users(id) on delete set null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint news_articles_status_check check (status in ('draft', 'published')),
  constraint news_articles_category_check check (category in ('general', 'match-report', 'transfer', 'interview', 'announcement'))
);

create index if not exists news_articles_status_published_idx on news_articles (status, published_at desc);
create index if not exists news_articles_category_idx on news_articles (category);
create index if not exists news_articles_competition_idx on news_articles (competition_id);

alter table news_articles enable row level security;

drop trigger if exists news_articles_set_updated_at on news_articles;
create trigger news_articles_set_updated_at before update on news_articles for each row execute procedure set_updated_at();

-- Public, matching every other content-image bucket (competition-logos,
-- team-logos, platform-brand-assets) — article cover images are rendered
-- on GGScoreLive's public News Center, so there is nothing to keep
-- private about them.
insert into storage.buckets (id, name, public)
values ('news-articles', 'news-articles', true)
on conflict (id) do nothing;
