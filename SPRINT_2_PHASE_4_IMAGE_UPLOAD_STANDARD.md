# GGSP — Image Upload Standard

Implements the confirmed decision: no visible image URL field anywhere in
the platform, one reusable upload workflow (Choose File → Preview →
Upload → Save) everywhere an image is set.

## 1. What existed before

Three different, inconsistent patterns, discovered by grepping every
`logo_url`/`photo_url`/`avatar_url` reference before writing any code:

| Entity | Before |
|---|---|
| Organization (logo, banner), Competition (logo), Venue (photo), User avatar | A plain "Paste URL" text `<Input>` — the operator had to host the image somewhere else first. |
| Team logo | A real upload, but a bare native `<input type="file">` with no preview, bundled into the whole entity form's own submit action (`uploadLogoIfPresent` inside `teams/actions.ts`). |
| Coach photo | A real, polished upload (`CoachPhotoUpload.tsx`) — but its own separate implementation of the same choose/preview/upload sequence, not shared with anything else. |

Team's and Coach's upload logic were near-identical copies of each other
(same validate → random filename → `storage.upload()` → `getPublicUrl()`
sequence, written twice).

## 2. What was built

- **`lib/image-upload.ts`** (NEW) — the one place a file actually reaches
  Supabase Storage. `uploadImage(bucket, file)`: validates it's an image
  under 5MB, uploads with a random filename, returns the public URL. No
  permission check of its own — every caller's own Server Action already
  gated the request (`requireFoundationAccess`, `requireAdmin`,
  `requireCoach`), the same "engine trusts its caller" precedent
  `lib/tactical-formation.ts` already established.
- **`components/ui/useImageUpload.ts`** (NEW) — the shared client-side
  state machine (choose → local blob preview → call the upload action →
  swap to the real URL or show an error). Both presentational components
  below use this instead of each keeping their own copy.
- **`components/ui/ImageUpload.tsx`** (NEW) — the one reusable upload
  widget used by every entity form. Two modes from the same component:
  **field mode** (`name` prop supplied) renders a hidden input so a
  surrounding `<form>` — Organization, Competition, Venue, Team, User
  Settings — submits the uploaded URL alongside every other field exactly
  like the URL text input it replaced; **immediate mode** (`name`
  omitted) is for a caller whose own action already persists (Coach
  photo has no surrounding form to submit).
- **`components/coach/CoachPhotoUpload.tsx`** (refactored, not replaced)
  — keeps its own centered hero-avatar-with-initials-fallback layout and
  Haitian Creole copy (a real, deliberate difference from the generic
  widget's inline icon+button layout), but now built on the same
  `useImageUpload` hook instead of its own duplicated upload logic.
- **Migration 012** — five new public storage buckets
  (`organization-logos`, `organization-banners`, `competition-logos`,
  `venue-photos`, `user-avatars`), mirroring the existing `team-logos`/
  `coach-photos` pattern exactly. No column changes — every entity's
  `logo_url`/`photo_url`/`avatar_url` column already existed and already
  stored a plain URL string; only how that string gets there changed.

## 3. Per-entity wiring

Every entity's own `actions.ts` gained one thin upload action
(`uploadOrganizationLogo`/`uploadOrganizationBanner`,
`uploadCompetitionLogo`, `uploadVenuePhoto`, `uploadTeamLogo`,
`uploadUserAvatar`) — a `requireX()` gate, then one line calling
`uploadImage()`. Team's `createTeam`/`updateTeam` no longer read a `logo`
file from `FormData` and upload it inline; they read `logo_url` as a
plain string, exactly like Organization/Competition/Venue always did —
the upload already happened, before the form's own Save button was even
clicked.

`OrganizationFormFields`, `CompetitionFormFields`, `VenueFormFields`, both
Team pages, and the Settings page all swapped their URL `<Input>` (or,
for Team, the bare native file input) for `<ImageUpload>`.

## 4. Migration 012 — verification (all 9 steps)

1–2. Created, reviewed (additive only — no column/table changes, just
`storage.buckets` rows).
3. Applied inside a transaction against the live database.
4–6. Verified: pre-migration baseline was exactly `coach-photos` +
`team-logos` (2 rows); post-migration, exactly those 2 plus the 5 new
buckets (7 rows total), all `public = true`, both pre-existing rows
byte-for-byte unchanged.
7. Verified the real application code path — uploaded a temporary 1×1
PNG to all five new buckets and confirmed each public URL was fetchable
(HTTP 200).
8. Deleted every temporary test object from all five buckets.
9. Confirmed the final baseline: all five new buckets empty, `coach-photos`
and `team-logos` unchanged at their real production object counts.

## 5. Quality gate

`npm run typecheck`, `npm run lint`, `npm run test` (127 tests, 13 files),
and `npm run build` all pass clean. The temporary `pg` driver used to
apply and verify the migration was removed afterward; `package.json`/
`package-lock.json` show no diff.

## Not yet done

Sponsor and Partner logos have no table yet (both explicitly listed as
"future" in the decision) — nothing to wire up until those entities
exist. `ImageUpload`/`useImageUpload` are already generic enough to cover
them the same way the moment they do: one new bucket, one thin upload
action, one `<ImageUpload>` call.
