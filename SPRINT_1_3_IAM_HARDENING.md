# Sprint 1.3 Hardening — Verification Report

Corrections applied to the existing IAM Foundation. No new product
features, no rebuild — this is exclusively the 12-item hardening list.

## Files modified

`lib/types.ts` (added `invitation_id` to `UserAccessAssignment`,
`invited_user_id` to `Invitation`) · `app/admin/invitations/actions.ts`
(full rewrite — lifecycle, scope, privilege, error handling) ·
`app/admin/users/actions.ts` (self-lockout guard, enum validation, error
handling) · `app/admin/users/[userId]/actions.ts` (ownership check, scope
validation, privilege guards) · `app/admin/access/actions.ts` (same) ·
`app/admin/roles/actions.ts` (enum validation) ·
`app/team/reset-password/actions.ts` (wired in `finalizeAcceptedInvitation`)
· `components/iam/ConfirmActionDialog.tsx` (now surfaces action errors
instead of only closing) · `app/admin/users/[userId]/page.tsx`,
`app/admin/access/page.tsx` (every status-change button now goes through
`ConfirmActionDialog`; error/success banners added) ·
`app/admin/users/page.tsx`, `app/admin/invitations/page.tsx` (centralized
role/status lists; invite form hides `super_admin` from non-super_admin
actors)

## Files created

`lib/validation.ts` (runtime enum guards) · `lib/privilege.ts`
(super_admin + self-lockout protection) · `lib/invitations.ts`
(`finalizeAcceptedInvitation`)

## Migration added

`supabase/migrations/005_iam_hardening.sql` — additive only:
- `user_access_assignments.invitation_id` (nullable FK → `invitations`,
  `on delete set null`) — item 2
- `invitations.invited_user_id` (nullable FK → `auth.users`,
  `on delete set null`) — distinguishes "the auth user Supabase created at
  invite time" from "the id recorded at genuine acceptance," needed for
  revoke's targeted `deleteUser` call
- `reject_audit_log_mutation()` trigger function + `BEFORE UPDATE` and
  `BEFORE DELETE` triggers on `audit_logs` — item 9, see below
- No existing column, row, or constraint was altered. No `UPDATE`
  statements touch existing data (documented inline in the migration —
  this was a deliberate scope decision, not an oversight: only *new*
  invitation-originated records use the corrected lifecycle going
  forward).

## 1. Invitation lifecycle

`inviteUser()` now creates the profile and assignment with status
`invited` (was `active`), links the assignment to the invitation via the
new `invitation_id` column, and stores `invited_user_id` on the
invitation. The invitation record itself stays `pending` until genuine
acceptance.

`lib/invitations.ts`'s `finalizeAcceptedInvitation(userId, email)` is the
new activation helper, wired into `app/team/reset-password/actions.ts`
immediately after `supabase.auth.updateUser({ password })` succeeds — the
actual moment of acceptance for both the coach-token flow and the unified
login's forgot-password flow. It:
1. Finds the most recent `pending` invitation matching the email.
2. Flips it to `accepted` with `accepted_user_id` set (guarded with
   `.eq("status", "pending")` on the update itself, closing a double-accept
   race).
3. Flips the profile to `active`.
4. Flips only the assignments created **by that specific invitation**
   (matched via `invitation_id`, and only ones still `invited`) to
   `active`.

If no matching pending invitation exists, it's a safe no-op — ordinary
password resets for already-active users, and the separate Sprint 1.2
coach-invite mechanism (which doesn't use the `invitations` table), are
unaffected. That coach mechanism was deliberately **not** touched — it's
Sprint 1.2 scope, out of bounds for "harden Sprint 1.3 only." Documented
explicitly in `lib/invitations.ts`'s doc comment.

## 2. Revoke behavior

`revokeInvitation()` now:
- Only operates on invitations still `status = 'pending'` — returns
  `not-pending` otherwise, so an already-accepted invitation (a real
  user now) can never be touched by this action; use the Users page for
  that account instead.
- Cascades: every `user_access_assignments` row with that `invitation_id`
  and still `status = 'invited'` flips to `disabled`.
- Disables the profile (only if it's still `status = 'invited'` — never
  touches a profile that's somehow already active, which is the "do not
  affect an already accepted user's unrelated assignments" guarantee in
  practice).
- Best-effort deletes the unaccepted Supabase Auth user
  (`invited_user_id`) via `admin.auth.admin.deleteUser()`, documented
  inline as server-only and best-effort — a failure there doesn't block
  the rest of the revoke, since the assignment/profile changes above
  already remove all platform access regardless.

## 3. Resend hardening

`resendInvitation()` now checks the `error` from
`inviteUserByEmail` explicitly, records `sent: true`/`sent: false` in the
audit metadata either way, and redirects to a distinct `email-failed`
error state rather than silently reporting success — the invitation's
`status` is only touched (reset to `pending`) implicitly by virtue of the
row already being `pending`; nothing is marked successful when the send
failed.

## 4. Super_admin protections

`lib/privilege.ts`:
- `assertCanManageRole(actorRole, targetRole)` — blocks any actor who
  isn't `super_admin` from creating, editing, or changing the status of
  anything scoped to the `super_admin` role. Called in `inviteUser`,
  `resendInvitation`, `revokeInvitation` (via the invitation's own
  `role_key`), `addAssignment`, `setAssignmentStatus`, `createAssignment`,
  `updateAssignmentStatus` — every assignment-touching action.
- `assertNotLastSuperAdmin(assignment)` — blocks suspending, disabling, or
  revoking the platform's last active `super_admin` assignment, checked
  by live count against `user_access_assignments`, regardless of who the
  actor is (protects even a super_admin from doing this to themselves or
  each other by mistake).
- The invite form (`/admin/invitations`) hides `super_admin` from the
  role dropdown entirely for non-super_admin actors — UI-level, backed by
  the server-side check above (never the only line of defense).

## 5. Self-lockout protections

`assertNotSelfLockout(actorUserId, targetUserId, kind, assignmentRole)`:
- `kind: "account"` — an admin can never suspend, disable, or archive
  their own account through `updateUserStatus`.
- `kind: "assignment"` — an admin can never revoke or suspend their own
  last `admin`/`super_admin`-capable assignment (counts their other
  active admin-capable assignments first; blocks only if this would be
  their last one).

## 6. Runtime validators added

`lib/validation.ts`: `isPlatformRole`, `isAccessStatus`,
`isInvitationStatus` — plain array-membership guards, no `as PlatformRole`
casts remain anywhere in the hardened action files (verified by removing
every one I'd initially written and confirming the code still type-checks
via proper control-flow narrowing after a `never`-returning guard clause,
not a cast).

## 7. Team/competition scope validation

`lib/iam.ts`'s `resolveAssignmentScope(roleKey, competitionId, teamId)`:
- Strips team/competition scope from roles that shouldn't have it
  (`ROLES_ALLOWING_TEAM`/`ROLES_ALLOWING_COMPETITION` in
  `lib/validation.ts`) regardless of what a form submitted.
- Requires a team for `coach` (`ROLES_REQUIRING_TEAM`) — rejects with a
  clear error if missing.
- Verifies the team actually exists, and if both a team and a competition
  were submitted, that the team's `competition_id` actually matches —
  rejects with "does not belong to the selected competition" otherwise.
- Existence checks: `userExists()` (new user id in `createAssignment`),
  plus every action re-fetches its target row (profile, assignment,
  invitation) before mutating and returns a clear error if it's gone.

## 8. Assignment ownership checks

`setAssignmentStatus(userId, assignmentId, status)` (the user-scoped
version) now fetches the assignment first and explicitly checks
`assignment.user_id === userId`, returning "does not belong to this user"
otherwise — it no longer updates by `assignmentId` alone. The final
`.update()` call also includes `.eq("user_id", userId)` as a second,
redundant guard at the database level.

## 9. Audit immutability enforcement

**Corrected from the original documentation, which overstated this.**
Sprint 1.3's original docs claimed immutability based on "RLS enabled, no
policies, and our code never calls update/delete" — that's a code
*convention*, not a database *guarantee*, since the service-role client
this app uses everywhere bypasses RLS by design. This hardening pass adds
an actual DB-enforced guarantee: `reject_audit_log_mutation()` plus
`BEFORE UPDATE`/`BEFORE DELETE` triggers on `audit_logs`, which fire for
every role — including `service_role` — because triggers are integrity
rules the database engine enforces, not row-visibility policies. Any
`UPDATE` or `DELETE` against `audit_logs`, from any code path, now raises
a Postgres exception. `SPRINT_1_3_IAM_FOUNDATION.md`'s §16 language has
been effectively superseded by this document; that section's claim should
be read as describing intent that is now actually enforced.

## 10. Migration resilience

`005_iam_hardening.sql` uses `add column if not exists`,
`create or replace function`, and `drop trigger if exists` before each
`create trigger`, so it's safe to run more than once. No destructive
statement (`drop table`, `drop column`, `alter type ... rename`) appears
anywhere in it.

## 11. Error handling

Every sensitive mutation across all five hardened `actions.ts` files now
checks its Supabase `error` explicitly, logs it server-side
(`console.error`, never exposing the raw error text to the client), and
either redirects with a specific, safe error code (invitations/access
"create" flows) or returns `{ ok: false, error: "<safe message>" }`
(status-toggle flows consumed by `ConfirmActionDialog`). No action records
a success audit event on a path where the underlying mutation's `error`
was non-null — every audit write sits strictly after its corresponding
successful mutation, not before or unconditionally.

## 12. Build / TypeScript / Lint

No network access in this sandbox — same caveat as every prior sprint;
the `.github/workflows/ci.yml` workflow is the authoritative check on next
push. What was actually done: a full structural static scan (brace/import
integrity, missing `"use client"`) across all 131 project files — clean —
and a manual, careful review of every `isXxx()` guard's control-flow
narrowing (the pattern `if (!isPlatformRole(x)) redirect(...)` followed by
using `x` as `PlatformRole` without a cast), confirmed correct against
TypeScript's documented narrowing behavior for `never`-returning
functions. Zero `any` in any file touched this pass (grepped explicitly).
`git diff --stat` against `schema.sql`, migrations 002-004, Coach Portal
submission logic, the Broadcast Control Center, Unified Login, and
`lib/coach-auth.ts` all confirmed empty — the only source file outside the
IAM module touched is `app/team/reset-password/actions.ts`, which is the
explicit, requested integration point for item 1.
