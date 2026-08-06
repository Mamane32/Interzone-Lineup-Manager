-- ============================================================================
-- White-Label Branding System — Components expansion (Brand Studio Phase 5)
-- ============================================================================
-- Additive only. Column names mirror lib/theme-tokens.ts's
-- LEVEL_1_LAYOUT_TOKENS registry exactly. border_radius/shadow_style/
-- card_style already exist (022/023) — this only adds the two new
-- Components tokens.

alter table platform_branding add column if not exists input_style text not null default 'filled';
alter table platform_branding add column if not exists badge_shape text not null default 'pill';

alter table platform_branding drop constraint if exists platform_branding_input_style_check;
alter table platform_branding add constraint platform_branding_input_style_check
  check (input_style in ('filled', 'outlined', 'underlined'));

alter table platform_branding drop constraint if exists platform_branding_badge_shape_check;
alter table platform_branding add constraint platform_branding_badge_shape_check
  check (badge_shape in ('pill', 'rounded', 'square'));
