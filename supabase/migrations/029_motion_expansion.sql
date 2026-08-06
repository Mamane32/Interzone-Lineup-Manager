-- ============================================================================
-- White-Label Branding System — Motion expansion (Brand Studio Phase 4)
-- ============================================================================
-- Additive only. Column names mirror lib/theme-tokens.ts's
-- LEVEL_1_BEHAVIOR_TOKENS registry exactly.

alter table platform_branding add column if not exists animation_speed numeric not null default 1;
alter table platform_branding add column if not exists hover_effects_enabled boolean not null default true;
alter table platform_branding add column if not exists modal_animation_enabled boolean not null default true;
alter table platform_branding add column if not exists loading_animation_enabled boolean not null default true;
alter table platform_branding add column if not exists smooth_scroll_enabled boolean not null default true;
alter table platform_branding add column if not exists reduced_motion boolean not null default false;

alter table platform_branding drop constraint if exists platform_branding_animation_speed_check;
alter table platform_branding add constraint platform_branding_animation_speed_check
  check (animation_speed between 0.25 and 2);
