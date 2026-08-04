# GGSP — Sprint 3 Phase 1 Release Notes

**Scope**: Enterprise Authentication & Invitation Lifecycle, plus the
Asset Platform foundation. Staging deployment
`https://interzone-lineup-manager-darodebass-4844-good-grafik-s-projects.vercel.app`,
migrations `016`–`017`.

## New

- **Unified invitation lifecycle for every role, including coaches.**
  Coach invitations now go through the same `invitations` table, audit
  trail, and Resend/Revoke UI as every other role, instead of a separate
  bypass path. The legacy `teams.coach_email` fallback for pre-existing
  teams is untouched. Confirmed live end-to-end: invitation email
  delivered, password set, Coach Portal access working, invitation status
  correctly reaches `accepted`.
- **Archive is a real account state.** `access_status` gained `'archived'`
  — the Archive button, present since an earlier sprint, now actually
  works instead of always failing.
- **Invitation expiry is enforced, not just displayed.** Accepting a
  genuinely expired invitation is now rejected with a clear message
  instead of silently succeeding; admins can resend or revoke an expired
  invitation, not only a still-pending one.
- **Admin-triggered Force Password Reset** — see *Known Issues* below;
  shipped but not yet safe to use as designed.
- **Asset Platform foundation.** Supabase Storage remains the single
  asset platform; `lib/image-upload.ts` is now the one shared asset
  service for the whole app. Application code requests typed
  `ASSET_CATEGORIES` (e.g. `TeamLogo`, `SponsorLogo`), never a raw bucket
  name — bucket names are resolved in exactly one place. Three new
  buckets (`competition-assets`, `sponsor-logos`, `official-photos`)
  ready for future Sponsor/Official entities (not built yet — storage
  only, by design). Uploads use immutable, server-generated identifiers,
  never the original filename; two categories (`CoachPhoto`,
  `UserAvatar`) are additionally namespaced by entity id where that id is
  already known at upload time.
- **`docs/ENVIRONMENTS.md`** — permanent reference for
  Development/Staging/Production separation and reserved system accounts.
- **`qa-staging@interzone.local`** — permanent staging regression account
  (`viewer`, active), reused across sprints instead of throwaway QA
  accounts.

## Fixed

- Archive button (`app/admin/users/[userId]/page.tsx`) — previously
  always failed with "Invalid status value."

## Known Issues

- **Force Password Reset is not reliably safe to use in its current
  form.** Confirmed live in a directly reproduced case: the account is
  banned before the reset email is sent, and Supabase Auth blocked the
  recovery-token flow for the banned account — the reset could not be
  completed, leaving the account locked until an administrator manually
  intervened. A later attempt against the same account, after an unrelated
  environment fix, did complete successfully; the difference between the
  two attempts is not fully explained (see the Validation Report's Finding
  2 and `FORCE_PASSWORD_RESET_DESIGN_REVIEW.md`) and is tracked as an
  implementation risk, not resolved by the second attempt's success.
  **Do not rely on this feature against a real account until the
  redesign ships.**
- **Supabase Auth URL Configuration for staging has been corrected.**
  Site URL and Redirect URLs now point at the staging deployment instead
  of falling back to `localhost:3000`. This was an environment
  configuration issue, not an application defect — see
  `docs/ENVIRONMENTS.md`. Its most visible symptom this phase was coach
  invitations appearing permanently stuck at `Pending`; that was this
  same misconfiguration, not a coach-specific application defect (see
  Validation Report Finding 4), and is resolved now that the redirect
  configuration is correct.
- **Resend Invitation fails for any invitation that's already been sent
  once.** Pre-existing defect, not introduced this phase — affects every
  role, not just coaches. Calling Supabase's `inviteUserByEmail()` a
  second time for the same email fails once that email already has a
  registered (even unconfirmed) auth account. Root cause confirmed via
  server logs; fix is a small, isolated change (use `generateLink`
  instead of a second `inviteUserByEmail` call), scoped separately from
  this phase.
- **Staging URL is temporary.** The current staging domain is a
  personal-account-scoped Vercel alias, not a permanent custom domain —
  tracked separately (`STAGING_DEPLOYMENT_PLAYBOOK.md`).
- **SMTP still deferred.** Invitations and password-recovery emails use
  Supabase's built-in, rate-limited sender.
- **Node.js 20.x deprecation** on Vercel — must be resolved before
  2026-10-01.
- **`deploy.ps1` production tooling debt** — documented, deliberately
  unchanged, out of scope until both staging and production are fully
  validated.

## Migrations

- `016_access_status_archived.sql` — adds `'archived'` to `access_status`.
- `017_asset_buckets.sql` — adds `competition-assets`, `sponsor-logos`,
  `official-photos` storage buckets.

## Upgrade notes

No breaking changes to any existing entity, table, or public API shape.
All additions are additive (new enum value, new buckets, new optional
function parameters). Existing upload call sites, existing invitation
flows for non-coach roles, and existing user status transitions are
unaffected.

## Status

**Sprint 3 Phase 1 is closed and declared the official validated baseline
(2026-08-02).** See `SPRINT_3_PHASE_1_ENGINEERING_SUMMARY.md` for the full
classification of every open item. Implementation is frozen — no further
code changes land against this phase. Sprint 3 Phase 2 planning is
captured in `SPRINT_3_PHASE_2_MASTER_PLAN.md` and requires separate
approval before any implementation begins.
