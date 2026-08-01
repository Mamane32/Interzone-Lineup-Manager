-- ============================================================================
-- SPRINT 2 PHASE 4 — Production Queue Engine (generalized Graphics Queue)
-- ============================================================================
-- Additive only. Run AFTER 012_image_upload_buckets.sql. Nothing existing is
-- altered, renamed, or dropped.
--
-- Approved as a Graphics-specific "graphics_queue" (see
-- SPRINT_2_PHASE_4_GRAPHICS_QUEUE_PROPOSAL.md), then generalized per
-- product decision into a consumer-agnostic queue before implementation —
-- Graphics is the first consumer, not the only one this schema can hold.
--
-- `consumer` is deliberately plain text, not a checked enum: Replay,
-- Animations, Sponsor Graphics, Commercial Breaks, Transitions, Audio
-- Cues, Countdown, and future Automation/AI modules are all real,
-- named future consumers (per product decision) — none of them should
-- ever require a migration just to be allowed to enqueue something.
-- `status` IS constrained (queued/live/hidden) because that state
-- machine is the queue's own invariant, true for every consumer alike.

create table if not exists production_queue (
  id uuid primary key default gen_random_uuid(),
  match_id uuid not null references matches(id) on delete cascade,
  consumer text not null,
  category text not null,
  item_key text not null,
  name text not null,
  payload jsonb,
  status text not null default 'queued' check (status in ('queued', 'live', 'hidden')),
  queue_order integer not null default 0,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index if not exists production_queue_match_idx on production_queue (match_id);
create index if not exists production_queue_status_idx on production_queue (match_id, consumer, status);

-- Each consumer is its own independent "on air" lane — Graphics having
-- something live doesn't block Replay (or any future consumer) from
-- also being live at the same time, matching how a real production
-- console runs Graphics/Replay/Audio as parallel channels, not one
-- global live slot.
create unique index if not exists production_queue_one_live_per_consumer
  on production_queue (match_id, consumer) where (status = 'live');

alter table production_queue enable row level security;

create trigger production_queue_set_updated_at
  before update on production_queue for each row execute procedure set_updated_at();
