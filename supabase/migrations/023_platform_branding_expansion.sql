-- ============================================================================
-- White-Label Branding System — Level 1 (Platform Owner) field expansion
-- ============================================================================
-- Additive only. Nothing existing is altered, renamed, or dropped.
--
-- Migration 022 gave platform_branding five fields (organization_name,
-- organization_subtitle, organization_logo_url, primary_color,
-- secondary_color). This migration adds every remaining Level 1 field from
-- the White-Label Branding spec's Identity / Brand Assets / Visual Theme /
-- Typography / Layout / Behavior sections. The table stays a strict
-- singleton (see 022's platform_branding_is_singleton check) — this only
-- widens the one row, it never adds rows.
--
-- Column names mirror lib/theme-tokens.ts's LEVEL_1_* token registries
-- exactly (each token's `column` field) so lib/branding.ts's read/write
-- mapping has no renaming to do.

-- IDENTITY (organization_name, organization_subtitle already exist)
alter table platform_branding add column if not exists platform_short_name text not null default 'GGSP';
alter table platform_branding add column if not exists tagline text not null default 'The Operating System for Football Competitions';
alter table platform_branding add column if not exists company_name text not null default 'GoodGrafik';
alter table platform_branding add column if not exists copyright_text text not null default '© GoodGrafik. All rights reserved.';
alter table platform_branding add column if not exists footer_text text not null default 'Securely powered by GoodGrafik';
alter table platform_branding add column if not exists browser_title text not null default 'GoodGrafik Sports Platform';
alter table platform_branding add column if not exists browser_description text not null default 'Run every matchday from one command center.';

-- BRAND ASSETS (organization_logo_url already exists = "Main Logo")
alter table platform_branding add column if not exists small_logo_url text;
alter table platform_branding add column if not exists header_logo_url text;
alter table platform_branding add column if not exists login_logo_url text;
alter table platform_branding add column if not exists loading_logo_url text;
alter table platform_branding add column if not exists splash_screen_url text;
alter table platform_branding add column if not exists favicon_url text;
alter table platform_branding add column if not exists browser_icon_url text;
alter table platform_branding add column if not exists placeholder_logo_url text;

-- VISUAL THEME (primary_color, secondary_color already exist)
alter table platform_branding add column if not exists accent_color text not null default '#22c55e';
alter table platform_branding add column if not exists success_color text not null default '#22c55e';
alter table platform_branding add column if not exists warning_color text not null default '#eab308';
alter table platform_branding add column if not exists error_color text not null default '#ef4444';
alter table platform_branding add column if not exists background_color text not null default '#07090d';
alter table platform_branding add column if not exists surface_color text not null default '#111720';
alter table platform_branding add column if not exists navigation_color text not null default '#0d1117';
alter table platform_branding add column if not exists header_color text not null default '#0d1117';
alter table platform_branding add column if not exists sidebar_color text not null default '#0d1117';
alter table platform_branding add column if not exists button_color text not null default '#f5a623';
alter table platform_branding add column if not exists link_color text not null default '#f5a623';

-- TYPOGRAPHY
alter table platform_branding add column if not exists font_family text not null default 'Inter';
alter table platform_branding add column if not exists font_weight text not null default 'normal';
alter table platform_branding add column if not exists heading_style text not null default 'display';
alter table platform_branding add column if not exists text_style text not null default 'regular';

-- LAYOUT
alter table platform_branding add column if not exists logo_size integer not null default 40;
alter table platform_branding add column if not exists logo_padding integer not null default 8;
alter table platform_branding add column if not exists header_height integer not null default 64;
alter table platform_branding add column if not exists sidebar_width integer not null default 260;
alter table platform_branding add column if not exists border_radius integer not null default 16;
alter table platform_branding add column if not exists shadow_style text not null default 'soft';
alter table platform_branding add column if not exists card_style text not null default 'glass';

-- BEHAVIOR
alter table platform_branding add column if not exists light_mode_enabled boolean not null default false;
alter table platform_branding add column if not exists dark_mode_enabled boolean not null default true;
alter table platform_branding add column if not exists default_theme text not null default 'dark';
alter table platform_branding add column if not exists animation_level text not null default 'normal';

-- Loose value guards — a bad string in a select-style field should fail
-- the write, not silently render broken. Kept permissive (a short fixed
-- list per field) to match lib/theme-tokens.ts's `options` arrays.
alter table platform_branding drop constraint if exists platform_branding_shadow_style_check;
alter table platform_branding add constraint platform_branding_shadow_style_check
  check (shadow_style in ('none', 'soft', 'elevated', 'sharp'));

alter table platform_branding drop constraint if exists platform_branding_card_style_check;
alter table platform_branding add constraint platform_branding_card_style_check
  check (card_style in ('glass', 'solid', 'flat', 'outlined'));

alter table platform_branding drop constraint if exists platform_branding_default_theme_check;
alter table platform_branding add constraint platform_branding_default_theme_check
  check (default_theme in ('dark', 'light', 'system'));

alter table platform_branding drop constraint if exists platform_branding_animation_level_check;
alter table platform_branding add constraint platform_branding_animation_level_check
  check (animation_level in ('none', 'reduced', 'normal', 'playful'));
