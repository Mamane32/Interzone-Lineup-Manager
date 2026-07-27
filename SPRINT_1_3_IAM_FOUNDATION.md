# Sprint 1.3 — Identity & Access Management Foundation

## 1. Concise summary

Added a full Identity & Access Management section inside the existing
Admin Portal: Users (search/filter/paginate/detail/status), Invitations
(generalizing the Sprint 1.2 coach-only invite into any role), Roles
(display metadata + live user counts), Access Assignments (global grant
management), and an append-only Audit Log. Every sensitive action is a
server action gated by the existing `requireAdmin()`, validates its own
input, and writes an audit event. Nothing about Unified Login, existing
Admin authentication, Coach routes, or the Broadcast Control Center was
touched — this sprint only adds new admin-side pages and one additive
migration.

## 2. Files created

**Migration**: `supabase/migrations/004_iam_foundation.sql`

**Shared lib**: `lib/iam.ts` (data-joining helpers — see §19 for why
manual joins were needed), `lib/audit.ts` (audit writer)

**Shared components**: `components/iam/{StatusBadge,RoleBadge,
InvitationStatusBadge,Pagination,ConfirmActionDialog}.tsx`

**Routes**:
`app/admin/users/{page.tsx,actions.ts}` ·
`app/admin/users/[userId]/{page.tsx,actions.ts}` ·
`app/admin/invitations/{page.tsx,actions.ts}` ·
`app/admin/roles/{page.tsx,actions.ts}` ·
`app/admin/access/{page.tsx,actions.ts}` ·
`app/admin/audit-log/page.tsx`

## 3. Files modified

`lib/types.ts` (added `InvitationStatus`, `Invitation`, `AuditLogEntry`,
`RoleMetadata`) · `app/admin/layout.tsx` (added the Identity & Access nav
group — visually separated, same nav style, no restructuring)

## 4. Components created

`UserStatusBadge`, `RoleBadge`, `InvitationStatusBadge`, `Pagination`,
`ConfirmActionDialog` — all in `components/iam/`, all generic (no
page-specific logic), reused across Users/Invitations/Roles/Access/Audit.

## 5. Components reused

`components/ui/{Card,Input,Select,Button}` — the existing admin design
system. No new visual language was introduced; IAM pages look like the
existing Competitions/Teams/Matches pages.

## 6. Routes added

`/admin/users`, `/admin/users/[userId]`, `/admin/invitations`,
`/admin/roles`, `/admin/access`, `/admin/audit-log` — all gated by
`requireAdmin()` (same as every other admin page since Sprint 1.2).

## 7. Server actions or handlers added

`updateUserStatus` · `updateProfile`, `addAssignment`, `setAssignmentStatus`
(user-scoped) · `inviteUser`, `resendInvitation`, `revokeInvitation` ·
`updateRoleDescription` · `createAssignment`, `updateAssignmentStatus`
(global). All 11 call `requireAdmin()` first and write an audit event
(where applicable) before returning.

## 8. Database migrations added

`004_iam_foundation.sql` — additive only. See §9.

## 9. Tables added or modified

**Added**: `invitations`, `audit_logs`, `role_metadata` (seeded with the
8 existing roles). **Modified**: none — `profiles`, `user_access_assignments`,
and every table from earlier sprints are untouched.

**Deliberately not added**: `permission_categories`/`permissions`/
`role_permissions`/`user_permissions` (the full permission matrix). The
brief explicitly allows deferring this ("does not require the final
permission matrix... create a clean foundation that can expand later").
Role-based checks (`requireRole()`) are the real, working enforcement
mechanism everywhere in this app today; four empty tables with no UI
reading them would be scaffolding nothing uses yet. The exact DDL for all
four tables is included, commented out, at the bottom of the migration
file — ready to copy into a new numbered migration the day a real
per-permission system is needed, along with the example permission keys
from the brief (`users.view`, `users.invite`, etc.).

## 10. RLS policies added or modified

**None added — same posture as every table since Sprint 1.2**: all three
new tables have RLS **enabled with zero public policies**. All reads/writes
go through the service-role client from `lib/iam.ts`/`lib/audit.ts` and the
route-specific `actions.ts` files, exactly like `profiles` and
`user_access_assignments` already work. This keeps one consistent
authorization model (server-side checks) instead of running RLS policies
and server checks side by side.

## 11. Indexes added

`invitations_email_idx` (on `lower(email)`, for invite lookups),
`invitations_status_idx`, `audit_logs_actor_idx`, `audit_logs_action_idx`,
`audit_logs_target_idx` (composite on target_type+target_id),
`audit_logs_created_idx` (descending, for the log's default sort order).

## 12. User invitation flow

1. Admin submits the Invite form (`/admin/invitations`) — name, email,
   role, optional competition/team/expiration/message.
2. `inviteUser()` server action: `requireAdmin()` → validate email+role
   present → **insert the `invitations` row first** (so it shows as
   "pending" even if the email send below fails) → call
   `supabase.auth.admin.inviteUserByEmail` → on success, upsert
   `profiles` + `user_access_assignments` for the new user → record
   `user.invited` audit event → redirect with a success flag.
3. If the Supabase email send fails (e.g. SMTP not configured), the
   invitation record still exists (visible, searchable), the failure
   reason is shown to the admin verbatim
   ("...check that Supabase Auth email is configured..." — not faked as
   success), and an audit event still records the attempt with
   `sent: false`.
4. Resend / Revoke are separate one-click actions from the Invitations
   table, each server-validated and audited.

## 13. Access assignment flow

Two entry points write to the same `user_access_assignments` table:
- **Per-user** (`/admin/users/[userId]`, "Add assignment") — scoped to
  one already-selected user.
- **Global** (`/admin/access`, "Add assignment") — picks the user from a
  dropdown of existing profiles first.

Both require role selection from a fixed enum-backed `<select>` (never a
free-text or client-trusted role value) and validate server-side before
insert. Suspend/Reactivate are one click; Revoke (per-user page) goes
through `ConfirmActionDialog` since it's the more destructive framing of
the same underlying status change.

## 14. Role-management behavior

Roles are a fixed Postgres enum (`platform_role`) — this sprint does not
let an admin create or delete roles (matches "System roles should not be
deleted casually" / "Do not silently rename existing role values"). What's
editable is the `role_metadata` row's `description` (for the team's own
reference) and, read-only, a live count of active assignments per role.

## 15. Permission foundation details

See §9. The working permission model today is **role-based**, enforced by
`lib/access.ts`'s `requireRole()`/`requireAdmin()` on every protected
route and server action (unchanged from Sprint 1.2, now also covering all
11 new IAM actions). The commented DDL in the migration is the documented
path to a real per-permission system later.

## 16. Audit-log behavior

Append-only by design: `audit_logs` has RLS enabled with no policies at
all (not even an admin-scoped update/delete policy), so no code path in
this app — admin included — can modify or delete a row once written; the
service-role client can technically insert but every write in this
codebase only ever calls `.insert()`, never `.update()`/`.delete()`, on
this table. The Audit Log page filters by action and date range, paginates
(30/page), and resolves each `actor_user_id` to a readable email in one
batched query (not N+1).

## 17. Admin bootstrap instructions

Unchanged from Sprint 1.2 — see `SPRINT_1_2_UNIFIED_AUTH.md` and the
README/`DEPLOYMENT_CHECKLIST.md` step 2. This sprint adds no new bootstrap
requirement; the same `admin` assignment already grants full IAM access
(this sprint treats `admin` and `super_admin` as equivalent for IAM, same
simplification documented in Sprint 1.2, for the same reason — no
organizations table exists yet to scope a narrower "admin" against).

## 18. Legacy coach fallback migration notes

Not touched, not expanded — no new email-based authorization logic was
written this sprint. What's new: `/admin/access` now surfaces a live,
named list of every team still relying on the `coach_email` fallback
(via `lib/iam.ts`'s `getLegacyCoachTeams()`, a straightforward "teams
with a coach_email but no matching assignment row" query), with a direct
link to re-invite them from the Invitations page. Once that list is
empty, the fallback branch in `lib/coach-auth.ts` and the coach login
action can be safely deleted — this is now something an admin can verify
visually instead of only via a database query.

## 19. Security review

- Every new route calls `requireAdmin()` before rendering or reading data.
- Every new server action calls `requireAdmin()` as its first line
  (verified: 11 of 11 exported functions across the 5 new `actions.ts`
  files).
- No role, user id, or scope value is ever accepted from a hidden form
  field trusted at face value without a corresponding server-side
  `requireAdmin()` gate; role/competition/team values submitted in forms
  are constrained to `<select>` options built from real database rows on
  the same request, and the insert itself is what enforces validity (an
  invalid foreign key simply fails).
- `lib/iam.ts` and `lib/audit.ts` are both marked `import "server-only"`.
- No new client-side Supabase client was created; the service-role key
  stays confined to the same `lib/supabase-admin.ts` module used
  everywhere else in this codebase.
- **Why manual joins instead of PostgREST embedding**: `profiles` and
  `user_access_assignments` each independently reference `auth.users`,
  not each other, so there's no foreign key path between them for
  Supabase's automatic relationship embedding. `lib/iam.ts` fetches
  profiles and their assignments as two queries and joins them in
  application code — one extra query per page load, not N+1 (assignments
  are fetched once per page of users, not once per user).

## 20. Known limitations

- No organizations/seasons tables exist, so "Organization" and "Season"
  filters/selectors from the brief aren't present — only Competition and
  Team, which are real. `organization_id` already sits nullable on
  `user_access_assignments` (Sprint 1.2) for when that table exists.
- `admin` and `super_admin` are functionally identical for IAM purposes
  this sprint (see §17).
- User search matches `full_name`/`email` only; searching by team or
  competition name (listed in the brief) isn't implemented — filtering by
  competition (a `<select>`, not free text) covers the same practical need
  today given the small number of competitions this platform manages.
- "Last activity" (distinct from "last login") isn't shown — only
  `last_sign_in_at` from Supabase Auth and this sprint's own audit log are
  available as activity signals; there's no separate activity-tracking
  table.

## 21. Remaining placeholders

None added deliberately this sprint that weren't already documented
elsewhere (Broadcast/Video/Advertising placeholders are Sprint 2.1's, not
touched here).

## 22. Build result

No network access in this sandbox — same caveat as every prior sprint.
The `.github/workflows/ci.yml` workflow will run the authoritative build
on next push.

## 23. TypeScript-check result

Reviewed by hand for type errors; zero `any` in any new file (verified
with `grep`, one instance found and fixed during review — see the commit
diff for `app/admin/access/page.tsx`).

## 24. Lint result

Not run (no network to install fresh in this sandbox) — will run via CI.

## 25. Confirmation: Unified Login remains functional

`app/login/`, `lib/access.ts`'s `resolveUserDestination`/`requireRole`,
and `middleware.ts` were not modified this sprint. Confirmed via
`git diff --stat`.

## 26. Confirmation: existing Admin authentication remains functional

`app/admin/login/actions.ts` was not modified. The only change to
`app/admin/layout.tsx` is the added nav links — the sign-in mechanism and
existing route protection are untouched.

## 27. Confirmation: Broadcast Control Center remains functional

No file under `app/live/**` or `components/live/**` was touched this
sprint. Confirmed via `git diff --stat`.

## 28. Confirmation: users cannot self-assign roles or teams

Every assignment-creating action (`addAssignment`, `createAssignment`,
`inviteUser`) requires `requireAdmin()` to pass before any database write
happens — there is no code path in this sprint where a non-admin session
can create or modify a `user_access_assignments` row for themselves or
anyone else.

## 29. Confirmation: Supabase service-role secrets are server-only

`lib/iam.ts` and `lib/audit.ts` both start with `import "server-only"`;
every file that imports them is a Server Component or a `"use server"`
actions file. No service-role key or admin-privileged client reference
appears in any client component (`"use client"` file) added this sprint.

## 30. Confirmation: RLS remains enabled

`invitations`, `audit_logs`, and `role_metadata` all have
`alter table ... enable row level security` in the migration, with zero
`create policy` statements for any of them — matching every other table
in this project. No existing RLS configuration was disabled or altered.
