-- ============================================================================
-- White-Label Branding System — explicit branding grant for Regular Admins
-- ============================================================================
-- Additive only. Nothing existing is altered, renamed, or dropped.
--
-- Per spec: "Regular Administrator — No branding access unless explicitly
-- granted." super_admin already has full branding access unconditionally
-- (lib/branding-permissions.ts), and competition_manager already gets
-- Level 2 access scoped to their own competition_id via the existing
-- user_access_assignments row (no new column needed for that case). This
-- column is only meaningful for role_key = 'admin' rows: false by default,
-- flippable per-admin by a super_admin without changing the role model.
alter table user_access_assignments
  add column if not exists can_manage_platform_branding boolean not null default false;
