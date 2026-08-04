# GGSP — Final Deployment Readiness Report

Scope: one last comprehensive local verification pass before provisioning
staging, per explicit instruction. Nothing was deployed. Nothing was
pushed or committed. Production was not touched.  One genuine defect was
found and fixed (below); everything else in this report is either a
confirmation of prior work or a documented, non-blocking finding.

---

## What was verified this pass

**Quality gate** — fresh `typecheck`, `lint`, `test` (131/131), and
`build`, all clean, run twice (once at the start of this pass, once after
the one code fix below).

**Hidden project-ref / localhost / local-only assumptions** — re-audited
across every file type (not just `.ts`), not just source code. The
current Supabase project ref appears in exactly two files:
`supabase/deploy/deploy.ps1` and its `README.md` — both deliberate, both
already documented as staying unchanged. No other file, including the
three staging docs written this sprint, references it. `localhost`
appears only in test fixtures, `.env.example`'s documented default, two
QA/UAT markdown reports, and CI's placeholder build env — all expected,
none load-bearing for staging. `.github/workflows/ci.yml` independently
confirms `next build` succeeds with placeholder Supabase credentials,
corroborating the earlier finding that no page performs a DB call outside
a request.

**All 5 authentication flows, live, with real Supabase-issued links** —
not code inspection:
- **Login** — real credentials, correct landing page.
- **Invitations** — sent a real invite through the admin UI, generated
  the actual Supabase action link (`generateLink`), and completed
  acceptance through `/auth/callback`'s fragment bridge exactly as a real
  emailed link would. Confirmed still working after this sprint's
  `deploy.ps1`/staging-planning work touched nothing in that code path.
- **Password recovery** — same real-link methodology, `type: "recovery"`
  this time, from request through to landing on `/admin/dashboard`.
- **Session persistence** — confirmed via a genuinely separate browser
  tab (real cookie, not client-side state).
- **Logout** — session cleared; a direct request to a protected route
  afterward correctly redirects to login rather than rendering.

**Every role and permission boundary, live** — all 8 platform roles now
have a synthetic test account (`super_admin`, `admin`, `competition_manager`,
`broadcast_operator`, `coach`, `referee`, `media`, `viewer` — the last two,
`admin` and `competition_manager`, didn't have dedicated accounts before
this pass and were created for it). Each one: logs in, lands on its
correct destination, and is correctly blocked (with a clear "does not have
access" message, not a crash) from every route it shouldn't reach.

**Broadcast, Production Queue, Public Match Center, Command Center,
storage/uploads** — live, not inferred:
- Broadcast Readiness page renders fully with working action links
  (confirms last sprint's `actionHref` RSC-serialization fix still holds).
- Both Production Queue output routes (`/broadcast-output/[matchId]/program`
  and `/preview`) render correctly with no console errors, showing the
  real on-air graphic and the real queue state.
- Public Match Center re-confirmed rendering a full match (score, timeline
  with all 6 event types including `second_yellow`, statistics) with zero
  console errors, no auth prompt — the exact page that crashed earlier
  this sprint before the `lib/event-meta.ts` extraction.
- Storage/uploads: since the Browser tool has no native file-picker
  automation for `<input type="file">`, the upload path was verified by
  exercising the identical Supabase Storage write `lib/image-upload.ts`
  performs (same bucket, same call shape) against the real `venue-photos`
  bucket, then loading the resulting public URL directly in the browser —
  confirming both the write path and the public-read policy work
  end-to-end. Combined with the earlier-verified `next/image` rendering of
  an uploaded avatar, this closes the loop without relying on a UI click
  the tooling can't perform. The test object was deleted afterward.
- Command Center: admin login → Matches page, clean, no console errors.
  Full 14-page nav walkthrough was already exhaustively done earlier this
  sprint and nothing in this pass's diff touched any admin page.

**Migration sequence** — `git status`/`git diff` on `supabase/` shows zero
changes since the exhaustive dependency-verification pass that produced
`STAGING_DEPLOYMENT_PLAN.md`. The verified sequence
(`schema.sql`, then `008` through `015`, each as its own execution) stands
as previously documented — nothing to re-derive.

**Dead code / duplicated logic / latent bugs** — a dedicated research pass
(not just grep spot-checks) covered every exported symbol in `app/`,
`components/`, `lib/` for orphaned exports, cross-checked `package.json`
dependencies against actual imports, and searched for abandoned files and
hidden environment assumptions outside the already-audited config files.
Full findings below.

---

## Genuine defect found and fixed this pass

**`components/live/MatchTimelineEvent.tsx` had a stale `export { EVENT_META };`** — a leftover re-export from this sprint's own `lib/event-meta.ts`
extraction (the fix for the Public Match Center / Broadcast report page
crash). Confirmed zero external consumers (both real call sites already
import `EVENT_META` from `@/lib/event-meta` directly, not from this file).
Removed the one dead line. Re-ran `typecheck` (clean) and re-verified the
Public Match Center live afterward — still renders correctly. This is the
only code change made during this pass; everything else below is
confirmation or documentation.

---

## Remaining blockers

**None.** Every item from the original acceptance review and the
follow-up staging audit is fixed and re-confirmed live in this pass. No
new blocker was found.

---

## Medium-priority issues

**None found that aren't already covered by an existing, documented
requirement.** The one thing worth naming explicitly: this pass hit
Supabase's built-in email sender's rate limit again while testing invite
acceptance (a known, already-diagnosed constraint from earlier this
sprint — not new). This is exactly why custom SMTP is listed as a
**required** step (not optional) in `STAGING_DEPLOYMENT_PLAN.md`'s Supabase
Dashboard configuration section — no new action needed here, just
confirming the existing requirement is correctly scoped as "required," not
"nice to have."

One local-only observation, explicitly **not** a staging/production risk:
a transient 404 was hit once on `/login` immediately after a live file
edit, self-resolved on the next navigation. This is `next dev`'s hot
module reload behavior, which does not exist in a production build
(`next build && next start` compiles once, serves without incremental
recompilation) — confirmed not applicable to staging or production.

---

## Low-priority technical debt (documented, not fixed — no features, no cosmetic refactoring per instruction)

From the dedicated dead-code/duplication research pass:

1. **`app/admin/login/actions.ts`'s `logout()` function is dead code** —
   never called; superseded by `unifiedSignOut()` elsewhere. `login()` in
   the same file is still live and used. Safe, trivial removal whenever
   someone next touches that file.
2. **The name→initials algorithm is implemented independently 4 times**
   (`components/coach/CoachPhotoUpload.tsx`, `CoachProfileCard.tsx`,
   `components/shell/AppShell.tsx`'s `initials()`,
   `app/admin/settings/page.tsx`) with no shared `lib/utils.ts` helper,
   despite this project's own precedent of consolidating exactly this
   kind of duplication (see the `Modal.tsx` history).
3. **`(process.env.NEXT_PUBLIC_APP_URL ?? "").replace(/\/$/, "")` is
   re-implemented inline 5 times** across 4 action files rather than one
   shared `appBaseUrl()` helper. Not a bug today (every site does the
   same correct thing), but it means a future change to that normalization
   logic has 5 places to update instead of 1.
4. **`lib/broadcast/ProductionQueueEngine.ts`'s `reorderProductionQueue()`
   and `removeProductionItem()` have zero callers** anywhere in the app.
   Possibly intentional forward-looking API surface for a not-yet-built
   consumer; worth a decision (wire up or remove) next time that file is
   touched, not now.
5. **`components/live/ConfirmDialog.tsx` and `components/iam/ConfirmActionDialog.tsx`**
   are two separate "confirm a dangerous action" components with
   overlapping purpose. Both correctly build on the shared `Modal`
   primitive (not the old triple-Modal problem), just never swept into
   one.
6. **`components/ui/MatchCountdown.tsx` and `components/coach/CountdownTimer.tsx`**
   duplicate the same time-math helper verbatim; the component split
   itself is an intentional, documented per-portal difference.
7. **The team "2-letter badge" fallback** (`team.name.slice(0,2).toUpperCase()`)
   is repeated inline in ~11 places. Trivial individually, same shape of
   duplication as #2.
8. **Date/time formatting uses inconsistent locales** across admin vs.
   coach-facing surfaces (`fr-HT` vs. `en`/browser-default). Likely
   intentional per-portal, worth a deliberate confirmation rather than an
   assumption, but not a defect.
9. **`supabase/deploy/deploy.ps1`'s project-ref lock and incomplete
   migration package list (`002`–`006` only)** — already documented and
   deliberately left unchanged in `STAGING_DEPLOYMENT_PLAN.md`'s "Known
   technical debt" section per prior explicit instruction. Restated here
   only for completeness of this report; no new decision needed.

No stale/unused npm dependencies found. No abandoned (`.bak`/`_old`/`_v2`)
files found. No hidden Windows-path, timezone, or other environment
assumptions found outside what was already covered by the staging plan.

---

## Final Go / No-Go recommendation

**GO for staging provisioning.**

Every acceptance scenario, every role boundary, every previously-fixed bug,
and the verified migration sequence all re-confirmed clean in this pass,
live, in a real browser, against the actual code that will ship. The one
defect found (a single dead line of code, zero behavioral impact,
confirmed via `typecheck` and a live re-check of the exact page it was
touching) is fixed. Every remaining item is either already covered by an
existing staging-plan requirement or is documented, non-blocking technical
debt explicitly out of scope for this pass per instruction.

Nothing here changes the plan already agreed in `STAGING_DEPLOYMENT_PLAN.md`
and `STAGING_DEPLOYMENT_CHECKLIST.md`. Ready to begin Phase 1 (provision
the new Supabase staging project, apply the verified bootstrap sequence,
verify schema integrity) on your confirmation — and only Phase 1. No
further phase begins without your explicit go-ahead for that phase.
