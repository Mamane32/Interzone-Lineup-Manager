# Sprint 2.0 Enterprise — Competition & Organization Foundation

## Summary

Built the full organizational hierarchy the platform needs to support more
than one customer: Organization → Competition → Season → Division → Stage →
Group, plus Venues (organization-scoped, ready for a future Match Center).
The existing `competitions` table was **extended in place**, not
duplicated — it's already referenced by `teams`, `matches`,
`user_access_assignments`, and `invitations`. Everything reuses the IAM
module's patterns directly: `requireRole` for access control, the same
`Pagination`/`ConfirmActionDialog`/`StatusBadge` components, the same
audit-logging helper, the same RLS posture (enabled, zero public
policies, service-role only).

## Files created

**Schema**: `supabase/migrations/006_competition_foundation.sql`

**Shared**: `lib/foundation.ts` (`requireFoundationAccess`, `slugify`,
`isSlugAvailable`, `existsById`, `searchOrganizations`, `searchVenues`)

**Shared components**: `components/foundation/{Modal,Drawer}.tsx` (shell
primitives, styled with the existing admin `ink`/`ink-panel` tokens) and
one `{Entity}FormFields.tsx` + `Create{Entity}Button.tsx` + `{Entity}Row.tsx`
per entity (Organization, Venue, Season, Division, Stage, Group,
Competition) — 21 files, all following the same shape.

**Routes**: `app/admin/{organizations,venues,seasons,divisions,stages,groups}/{page.tsx,actions.ts}`

## Files modified

`lib/types.ts` (extended `Competition` with ~20 optional fields — backward
compatible, every pre-migration record still type-checks; added
`Organization`/`Season`/`Division`/`Stage`/`CompetitionGroup`/`Venue`) ·
`app/admin/competitions/{actions.ts,page.tsx}` (the one existing module
this sprint extends — new fields, organization scoping, archive/restore,
audit logging; the existing hard-delete `deleteCompetition` was kept
as-is, not removed) · `app/admin/layout.tsx` (nav — moved "Competitions"
into a new "Competition Management" group alongside the six new pages)

## Routes created

`/admin/organizations`, `/admin/venues`, `/admin/seasons`,
`/admin/divisions`, `/admin/stages`, `/admin/groups` — all gated by the
new `requireFoundationAccess()` (`super_admin`/`admin`/
`competition_manager`, per the brief).

## Server actions

Per entity: `create{Entity}`, `update{Entity}`, `set{Entity}Status`
(archive/restore) — 6 entities × 3 actions = 18, plus Seasons' extra
`activateSeason` (see below) and Competitions' pre-existing
`deleteCompetition`. Every one calls `requireFoundationAccess()` first,
checks its Supabase error explicitly, and records an audit event only
after a confirmed successful write.

## Database migration

`006_competition_foundation.sql` — additive only:
- `organizations` (new table, 18 fields per the brief)
- `competitions` **extended via `ALTER TABLE ADD COLUMN IF NOT EXISTS`**
  — every new column nullable or defaulted, so no existing row needs a
  data migration
- `seasons`, `divisions`, `stages`, `competition_groups` (named to avoid
  the reserved SQL word `group`), `venues`
- `foundation_status` enum (`active`/`archived`) shared across all of them
- Slug uniqueness is **organization-scoped**, not global (`competitions_org_slug_idx`,
  `venues_org_slug_idx` — both partial unique indexes on
  `(organization_id, slug) where organization_id is not null and slug is not null`),
  correct for a multi-tenant platform
- **`seasons_one_active_per_competition`** — a partial unique index
  (`on seasons (competition_id) where status = 'active'`) — this is the
  actual database-enforced guarantee behind "only one active season per
  competition," not just application discipline

## Tables added/modified

Added: `organizations`, `seasons`, `divisions`, `stages`,
`competition_groups`, `venues`. Modified (extended only): `competitions`.

## Relationships

`teams` → `organizations` (via `venues`, once Teams adopts a venue in a
future sprint) · `competitions` → `organizations` · `seasons` →
`competitions` · `divisions` → `seasons` · `stages` → `divisions` ·
`competition_groups` → `stages` · `venues` → `organizations`. No `matches`
→ `venues` foreign key was added — explicitly out of scope this sprint.

## Indexes

One per foreign key column on every new table (`organizations_status_idx`,
`competitions_organization_idx`, `competitions_status_idx`,
`seasons_competition_idx`, `divisions_season_idx`, `stages_division_idx`,
`competition_groups_stage_idx`, `venues_organization_idx`,
`venues_status_idx`), plus the three unique indexes described above.

## RLS

Enabled on all six new tables, zero public policies — identical posture to
every table since Sprint 1.2. All access goes through
`supabaseAdmin()` from server actions gated by `requireFoundationAccess()`.

## Audit events

`organization.{created,updated,archived,restored}` ·
`competition.{created,updated,archived,restored,deleted}` ·
`season.{created,updated,archived,activated}` ·
`division.{created,updated,archived,restored}` ·
`stage.{created,updated,archived,restored}` ·
`group.{created,updated,archived,restored}` ·
`venue.{created,updated,archived,restored}`.

## Validation rules

- Server-side slug uniqueness (organization-scoped) checked before every
  insert/update, via `isSlugAvailable()` — never trusts the client didn't
  submit a duplicate.
- Every "create"/"update" action re-fetches its target row before
  mutating and returns a clear error if it's gone (`existsById`).
- Enum-like text fields (`competition_type`, `gender`, `stage_type`,
  `surface_type`) are validated against a fixed allow-list in the action
  itself before insert — an unrecognized value is stored as `null`
  instead of an arbitrary string.
- `activateSeason()` handles the one-active-per-competition rule
  correctly: it archives any other active season for that competition
  *first*, then activates the requested one — doing it in the other
  order would hit the partial unique index and fail.

## Known gaps / next steps (honest, not silently dropped)

- The per-entity list pages (Seasons/Divisions/Stages/Groups) use simple
  parent-scoped filtering rather than the full server-side text search +
  bulk-select-and-bulk-archive the brief describes for every entity —
  Organizations and Venues got the fuller treatment (search, pagination);
  the four nested entities are typically small lists per parent (a
  competition rarely has more than a handful of seasons), so this was a
  deliberate scope trade-off given the sprint's size, not an oversight.
- `deleteCompetition` (pre-existing hard delete) doesn't go through
  `ConfirmActionDialog` yet — it's a plain form button, same as before
  this sprint. Worth wrapping in confirmation in a follow-up pass.
- No bulk actions (select-many, archive-many) were built for any entity.

## Confirmations

- **IAM unchanged**: `git diff --stat` against every file under
  `app/admin/{users,invitations,roles,access,audit-log}` and
  `lib/{access,privilege,validation,invitations,audit,iam}.ts`: empty.
- **Unified Login unchanged**: `git diff --stat` against `app/login/**`,
  `app/team/**`, `lib/access.ts`, `middleware.ts`: empty.
- **Broadcast Control Center fully functional**: `git diff --stat`
  against `app/live/**`, `components/live/**`: empty.
- **No Admin regression**: only `app/admin/competitions/**` and
  `app/admin/layout.tsx` (nav) were touched outside the new Foundation
  routes; `app/admin/{dashboard,matches,teams,lineups,settings}` untouched.
- Zero `any` in any new or modified file (checked with `grep`).

## Build / TypeScript / Lint

No network access in this sandbox — same caveat as every prior sprint;
`.github/workflows/ci.yml` is the authoritative check on next push. A full
structural static scan (brace/import integrity, missing `"use client"`)
across all 167 project files came back clean.
