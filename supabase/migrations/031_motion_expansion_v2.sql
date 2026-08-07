-- ============================================================================
-- White-Label Branding System — Motion expansion v2 (full motion system)
-- ============================================================================
-- Additive only. Column names mirror lib/theme-tokens.ts's
-- LEVEL_1_BEHAVIOR_TOKENS registry exactly. 029_motion_expansion.sql
-- already added animation_speed/hover_effects_enabled/
-- modal_animation_enabled/loading_animation_enabled/
-- smooth_scroll_enabled/reduced_motion — this adds the rest of the
-- granular motion controls.

alter table platform_branding add column if not exists hover_intensity text not null default 'normal';
alter table platform_branding add column if not exists button_press_feedback_enabled boolean not null default true;
alter table platform_branding add column if not exists card_hover_behavior text not null default 'none';
alter table platform_branding add column if not exists drawer_animation_enabled boolean not null default true;
alter table platform_branding add column if not exists dropdown_animation_enabled boolean not null default true;
alter table platform_branding add column if not exists tooltip_animation_enabled boolean not null default true;
alter table platform_branding add column if not exists toast_animation_style text not null default 'fade';
alter table platform_branding add column if not exists focus_ring_animation_enabled boolean not null default false;
alter table platform_branding add column if not exists page_transition_style text not null default 'none';

alter table platform_branding drop constraint if exists platform_branding_hover_intensity_check;
alter table platform_branding add constraint platform_branding_hover_intensity_check
  check (hover_intensity in ('subtle', 'normal', 'strong'));

alter table platform_branding drop constraint if exists platform_branding_card_hover_behavior_check;
alter table platform_branding add constraint platform_branding_card_hover_behavior_check
  check (card_hover_behavior in ('none', 'lift', 'glow', 'border'));

alter table platform_branding drop constraint if exists platform_branding_toast_animation_style_check;
alter table platform_branding add constraint platform_branding_toast_animation_style_check
  check (toast_animation_style in ('none', 'fade', 'slide'));

alter table platform_branding drop constraint if exists platform_branding_page_transition_style_check;
alter table platform_branding add constraint platform_branding_page_transition_style_check
  check (page_transition_style in ('none', 'fade', 'slide'));
