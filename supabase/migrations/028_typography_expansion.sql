-- ============================================================================
-- White-Label Branding System — Typography expansion (Brand Studio Phase 3)
-- ============================================================================
-- Additive only, same discipline as every prior platform_branding
-- migration. Column names mirror lib/theme-tokens.ts's LEVEL_1_TYPOGRAPHY_TOKENS
-- token registry exactly.

alter table platform_branding add column if not exists letter_spacing_em numeric not null default 0;
alter table platform_branding add column if not exists line_height numeric not null default 1.6;
alter table platform_branding add column if not exists paragraph_spacing_px integer not null default 16;
alter table platform_branding add column if not exists text_transform text not null default 'none';
alter table platform_branding add column if not exists font_size_scale numeric not null default 1;

alter table platform_branding drop constraint if exists platform_branding_text_transform_check;
alter table platform_branding add constraint platform_branding_text_transform_check
  check (text_transform in ('none', 'uppercase', 'lowercase', 'capitalize'));

alter table platform_branding drop constraint if exists platform_branding_letter_spacing_check;
alter table platform_branding add constraint platform_branding_letter_spacing_check
  check (letter_spacing_em between -0.02 and 0.15);

alter table platform_branding drop constraint if exists platform_branding_line_height_check;
alter table platform_branding add constraint platform_branding_line_height_check
  check (line_height between 1.1 and 2);

alter table platform_branding drop constraint if exists platform_branding_paragraph_spacing_check;
alter table platform_branding add constraint platform_branding_paragraph_spacing_check
  check (paragraph_spacing_px between 0 and 48);

alter table platform_branding drop constraint if exists platform_branding_font_size_scale_check;
alter table platform_branding add constraint platform_branding_font_size_scale_check
  check (font_size_scale between 0.85 and 1.3);
