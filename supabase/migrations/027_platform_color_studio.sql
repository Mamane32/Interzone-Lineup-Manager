-- ============================================================================
-- White-Label Branding — Brand Studio Phase 1: Color Studio
-- ============================================================================
-- Additive only. Nothing existing is altered, renamed, or dropped.
--
-- Adds the remaining named tokens from the Color Studio's "complete
-- design token system" (lib/theme-tokens.ts): Info (the fourth semantic
-- status color, alongside the existing Success/Warning/Error), Border,
-- and Text Primary/Secondary. Primary/Secondary 50–900 scales are
-- deliberately NOT stored per-stop here — they're computed live from the
-- existing primary_color/secondary_color columns by
-- lib/color-utils.ts's generateColorScale(), the same way Tailwind/Radix
-- derive their own default palettes from one seed color rather than
-- shipping ten hand-authored hex values per hue.
--
-- Also adds optional two-color gradient support for Primary and Accent —
-- the two tokens most likely to drive a hero/button gradient — as a
-- boolean flag plus an end color and an angle, layered on top of each
-- token's existing single base color rather than replacing it, so
-- disabling a gradient always cleanly falls back to the solid base color
-- that was already there.
alter table platform_branding
  add column if not exists info_color text not null default '#38bdf8',
  add column if not exists border_color text not null default '#232b35',
  add column if not exists text_primary_color text not null default '#f5f7fa',
  add column if not exists text_secondary_color text not null default '#8b98a5',
  add column if not exists primary_gradient_enabled boolean not null default false,
  add column if not exists primary_gradient_end text not null default '#f59e0b',
  add column if not exists primary_gradient_angle integer not null default 135,
  add column if not exists accent_gradient_enabled boolean not null default false,
  add column if not exists accent_gradient_end text not null default '#16a34a',
  add column if not exists accent_gradient_angle integer not null default 135;
