# GGSP — Sprint 3 Phase 1: Enterprise Authentication & Asset Platform Foundation

Implements Phase 1 of the approved Master Prompt V2 roadmap: closes four
confirmed gaps in the invitation/access lifecycle, then lays the storage
foundation for future sponsor/official asset management. Staging had just
passed a full 13-item smoke test and was accepted as the validated baseline
before this phase began — nothing that passed that test was rewritten here.

## 1. What was already true (verified by reading the code, not assumed)

The core Master Prompt V2 rule — "no invited user ever receives a
password, every user sets their own" — was **already fully implemented**
before this phase, via `admin.auth.admin.inviteUserByEmail()` in both the
admin-invite path and the (then-separate) coach-invite path. This phase is
therefore four targeted fixes, not a rebuild.

## 2. Enterprise Authentication & Invitation Lifecycle

| Gap found | Fix |
|---|---|
| Coach invitations bypassed the unified `invitations` table entirely (`inviteCoach` wrote `profiles`/`user_access_assignments` directly) | New **`lib/invitation-service.ts`** (`createInvitation`, `resendInvitationCore`) shared by both `inviteUser` and the rewritten `inviteCoach`. Coaches now appear in `/admin/invitations` with working Resend/Revoke and the same audit trail as every other role. The pre-Sprint-1.2 `teams.coach_email` string-match fallback is untouched. |
| The "Archive" button always failed — `"archived"` was never a real `access_status` enum value | **Migration 016** adds it. Wired through `lib/types.ts`, `lib/validation.ts`, `app/admin/users/actions.ts`'s privilege guard (now covers archive the same as suspend/disable). |
| `invitations.expires_at` was computed for display only, never enforced | `lib/invitations.ts`'s `finalizeAcceptedInvitation` now rejects an actually-expired invite at acceptance time (writes real `status: 'expired'`). `resendInvitation`/`revokeInvitation` and the admin UI now handle `'expired'`, not just `'pending'`, so an expired invite is never permanently stuck. |
| No admin-triggered password reset existed — only self-service | New `forcePasswordReset` action, gated to `active`/`suspended` accounts. New **`lib/auth-admin.ts`** (`lockOutUser`/`restoreUserAccess`, via Supabase's `ban_duration`) provides immediate session invalidation — this app's middleware calls `supabase.auth.getUser()` live on every protected request, so a banned user's very next request anywhere is rejected. The lockout lifts automatically once the person completes the reset (`app/team/reset-password/actions.ts`). |

`ConfirmActionDialog` gained optional `disabled`/`disabledReason` props
(backward-compatible) to support Force Password Reset's eligibility rule
without a bespoke component.

## 3. Asset Platform foundation

Triggered by a real question: "where do static assets live in this
architecture?" There is no `/public` directory, deliberately — Vercel's
serverless functions have no writable persistent filesystem at runtime, so
every uploaded asset lives in **Supabase Storage**, the only live,
writable, CDN-backed option. This was already the exclusive, consistent
pattern for every existing asset type; this phase extended it.

**New buckets** (Migration 017): `competition-assets`, `sponsor-logos`,
`official-photos`. Storage only — no Sponsor/Official tables or admin CRUD
yet; that's explicitly a later phase once those entities' data models are
designed, not something to improvise as a side effect of adding storage.

**`lib/image-upload.ts` became the single asset service**, not just an
upload helper:

- **Typed categories, never raw bucket strings.** `ASSET_CATEGORIES`
  (`TeamLogo`, `CompetitionLogo`, `CompetitionAsset`, `SponsorLogo`,
  `OfficialPhoto`, `CoachPhoto`, `OrganizationLogo`, `OrganizationBanner`,
  `VenuePhoto`, `UserAvatar`) map internally to actual bucket ids via one
  private table. Application code asks for `ASSET_CATEGORIES.TeamLogo`,
  never `"team-logos"`. A future bucket rename, CDN change, or
  storage-provider migration touches only that one mapping — verified by
  grep that `.storage.from(...)` occurs nowhere else in the codebase, so
  this refactor is fully closed, not partial. All 7 pre-existing call
  sites were migrated; zero raw bucket-string calls remain.
- **`listAssets(category, entityId?)`** (new) — retrieval, not just
  upload. Exists specifically for the three new categories that have no
  admin CRUD yet to browse imported files through otherwise.
- **Immutable, server-generated paths.** Every upload path is
  `randomUUID().<ext>` — never the original filename (only the extension
  is kept, for content type). The application only ever persists the
  returned public URL; the original filename is discarded entirely. This
  was already true before this phase and remains true for all 10
  categories with no exceptions.

## 4. Entity-id namespacing — done where safe, deliberately deferred where not

`uploadImage()` and `listAssets()` gained an **optional** `entityId`
parameter: when supplied, the path becomes `<entityId>/<uuid>.<ext>`
instead of flat `<uuid>.<ext>`, enabling future per-entity asset browsing
and versioning without changing the immutability guarantee.

**Wired now** — both had a known entity id already available at upload
time, with zero flow changes required:
- `CoachPhoto` → nests under `team.id` (`app/team/[token]/(coach)/profile/actions.ts`)
- `UserAvatar` → nests under the session user's `id` (`app/admin/settings/actions.ts`)

**Deliberately not wired** — `TeamLogo`, `VenuePhoto`, `OrganizationLogo`,
`OrganizationBanner`, `CompetitionLogo`. All five use an established,
working "upload immediately when a file is chosen, before the entity's
own create form is submitted" pattern (`components/ui/useImageUpload.ts`)
— for a brand-new entity, there is genuinely no id yet at the moment the
file is uploaded. Nesting these would require pre-generating entity IDs
before insert and restructuring five create flows — a real redesign of
the creation workflow, not a safe drop-in addition, and out of scope for
a no-regression phase.

**This is recorded, explicit product decision, not technical debt.**
Entity-first creation for Teams, Competitions, Organizations, and Venues
is deferred to a future sprint that intentionally redesigns those
creation workflows — at which point these five upload actions gain the
same `entityId` argument `CoachPhoto`/`UserAvatar` already use today. The
optional `entityId` parameter already exists on `uploadImage`/`listAssets`
specifically so that future work is a small, additive change, not another
refactor.

## 5. Regression verification

Full local quality gate re-run after every change in this phase:
`typecheck`, `lint`, `test` (131/131, including two characterization tests
extended to cover the new enum value and the two new migration files),
and a full production `build` — all clean, zero regressions to any
previously-passing workflow.

**Still required before this phase is closed on staging**: migrations
`016` then `017` applied in order, deploy, and the full regression pass
from the approved plan (13-item smoke test + coach-invite end-to-end +
legacy coach fallback untouched + archive/expiry/force-reset flows +
the one genuinely open technical question — whether a banned account can
still complete its own recovery-link flow).
