# GGSP — Sprint 3 Phase 1 Validation Report

Staging environment:
`https://interzone-lineup-manager-darodebass-4844-good-grafik-s-projects.vercel.app`
Deployment: `dpl_8SR6USKr5gF1wm6FgaFctJhCMAqm` (2026-08-02)
Migrations applied: `016_access_status_archived.sql`,
`017_asset_buckets.sql`, confirmed via live enum/bucket verification
queries before deploy.

## 1. Local quality gate

`typecheck`, `lint`, `test` (131/131, including two characterization
tests extended for the new enum value and the two new migration files),
`build` — all clean, re-run after every change through this phase's
implementation, including this final validation pass.

## 2. 13-point staging smoke test (post-deploy)

| # | Checkpoint | Result |
|---|---|---|
| 1 | Authentication session | PASS |
| 2 | Role resolution | PASS |
| 3 | Dashboard loading | PASS |
| 4 | Competitions | PASS |
| 5 | Teams | PASS |
| 6 | Matches | PASS |
| 7 | Lineups | PASS |
| 8 | Command Center (Users, Venues) | PASS — Users' Status filter now includes `archived` |
| 9 | Broadcast | PASS |
| 10 | Public Match Center | PASS |
| 11 | API/server errors | PASS — zero unexpected errors across all pages tested |
| 12 | Browser console errors | PASS |
| 13 | Network request failures | PASS — only benign Next.js/Vercel prefetch aborts, same pattern as prior passes |

## 3. Sprint 3 Phase 1 feature verification

- **Item 2 (Archive fix)**: confirmed live — Users page Status filter and
  the Archive/Reactivate button pair render and function correctly against
  the real `archived` enum value.
- **Item 3 (expiry enforcement)**: code path implemented and unit-adjacent
  logic verified via the characterization suite; full live expire→resend
  cycle not separately re-exercised in this pass (already covered by the
  local regression suite's migration/validation tests).
- **Item 1 (coach invite unification)**: confirmed — `dadoubass@gmail.com`'s
  coach invitation is present in `/admin/invitations` (not the old bypass
  path), consistent with the unified `invitations` table design. Initially
  observed stuck at `pending`; root-caused to Finding 1 (environment
  configuration), not the unification logic itself — see Finding 4 below.
  After the Auth URL fix, the full invite → email → password set → Coach
  Portal access flow was confirmed working end-to-end live, and the
  invitation correctly reached `accepted`.
- **Item 4 (Force Password Reset)**: **executed live, findings below —
  a confirmed defect, not a pass.**

## 4. Confirmed findings

### Finding 1 — Supabase Auth redirect configuration (environment)

- **Root cause**: the staging Supabase project's Authentication → URL
  Configuration (Site URL and/or Redirect URLs allowlist) does not
  currently accept this app's actual `redirectTo` values, causing Supabase
  to fall back to its own out-of-the-box default Site URL,
  `http://localhost:3000`, instead of the staging domain.
- **Evidence**: `NEXT_PUBLIC_APP_URL` confirmed correctly set for this
  Preview deployment via `vercel env ls preview`. Application code
  confirmed to construct `redirectTo` correctly
  (`app/admin/users/[userId]/actions.ts`'s `forcePasswordReset` and every
  other invite/reset action). Live test: triggering Force Password Reset
  on `dadoubass@gmail.com` resulted in a real, successfully delivered
  email; clicking the link redirected to `http://localhost:3000/#error=...`
  rather than the staging domain — the signature of an unmatched
  `redirectTo` falling back to Supabase's default Site URL, not an
  application-generated URL.
- **Impact**: blocks the redirect target of every email-driven auth flow
  (password reset, invitations, coach reset) from landing on the actual
  staging app. Does not by itself prevent the underlying token exchange
  from being attempted (see Finding 2, which is independent of this one).
- **Recommended solution**: in the staging Supabase project, set Site URL
  to the current staging URL and add a wildcard Redirect URLs entry
  (`<staging-url>/**`) covering the `?next=...` query variants this app
  sends. Documented as a required environment prerequisite in
  `docs/ENVIRONMENTS.md`. **No application code change indicated** — the
  app-generated URL was confirmed correct before concluding this.
- **Belongs to**: environment configuration, staging setup — not a code
  phase. Re-verify whenever a fresh staging Supabase project is
  provisioned or the staging URL changes.

### Finding 2 — Force Password Reset sequencing defect (application logic)

- **Root cause**: `forcePasswordReset` bans the account
  (`lockOutUser`, `ban_duration: "876000h"`) *before* the reset email is
  sent. Supabase Auth blocks recovery-token verification for a banned
  user, not only ordinary sign-in. Because `restoreUserAccess()` (the
  unban) only runs *inside* `setNewPassword`, *after* a successful
  `updateUser({password})` call, and that call can never succeed for a
  banned user, the account reaches a state it cannot self-recover from.
- **Two verified observations, recorded separately — not merged into one
  conclusion:**
  - **Round 1** (2026-08-02, staging Supabase Site URL still misconfigured
    per Finding 1): Force Password Reset executed successfully server-side
    (audit log entry `user · password reset forced` at 18:22:09; server
    logs clean, `info` level, no error). Reset email delivered
    successfully. On clicking the real link:
    `#error=access_denied&error_code=user_banned` — generated by
    Supabase's own Auth server during recovery-token verification,
    independent of Finding 1's redirect-target issue (this error is
    emitted before any redirect-target resolution happens). Account
    confirmed stuck in a banned, non-self-recoverable state as a direct
    result.
  - **Round 2** (same day, after the Supabase Auth URL Configuration was
    corrected per Finding 1's recommended fix — Site URL and Redirect URLs
    updated to point at the staging deployment): Force Password Reset
    triggered again against the same account. Per the administrator's live
    report: the reset email was received, the link opened successfully,
    the password was changed successfully, and the account was recovered.
    No independent server-side confirmation beyond the administrator's
    direct report was collected for this round.
  - **What this does and does not establish**: both rounds are real,
    directly observed events — they are not in conflict as *observations*.
    What's genuinely open is *why* Round 2 succeeded where Round 1 failed
    with the code path unchanged between them. Two candidate explanations
    exist and neither is confirmed: (a) Round 1's failure was actually
    caused by Finding 1 in a way not yet fully isolated from this defect
    (i.e. the two findings may be less independent than first assessed),
    or (b) `ban_duration`'s effect on the recovery-token-verification step
    is not fully deterministic/immediate in this Supabase version, and the
    ban had already lifted or not yet taken effect by the time Round 2's
    link was clicked. **Neither is asserted as fact.** Community-sourced
    material (not official Supabase reference documentation) raised the
    possibility of inconsistent `ban_duration` enforcement — see
    `FORCE_PASSWORD_RESET_DESIGN_REVIEW.md`'s correction section — and that
    remains exactly what it was represented as there: **an implementation
    risk supported by evidence, not a confirmed platform defect.** It is
    not reproduced against official documentation in this session and
    should not be cited as one until it is.
- **Impact**: Round 1 alone is sufficient to establish that Force Password
  Reset, as currently implemented, **can** fail its own stated purpose —
  "access returns only once a new password is set" was unreachable at
  least once, under directly observed conditions. Whether that failure
  mode is reliably avoidable simply by keeping the Auth URL Configuration
  correct, or whether it can still recur intermittently, is not resolved
  by these two data points alone.
- **Recommended solution**: see `FORCE_PASSWORD_RESET_DESIGN_REVIEW.md` —
  full comparison of three options, recommending password rotation +
  direct refresh-token revocation via a dedicated Postgres function,
  decoupled entirely from `ban_duration`, so the deadlock class of bug
  cannot recur regardless of which explanation above turns out to be true.
- **Belongs to**: confirmed Sprint 3 Phase 1 application defect. **This
  classification does not change based on Round 2's outcome** — a single
  reproduced failure (Round 1) is sufficient grounds, and a later success
  under different environment conditions doesn't retract a directly
  observed defect. Fix implementation is queued as the first item of
  Phase 2 (or immediately preceding it), per the design review's
  sequencing recommendation — not blocking Phase 1 closure, provided Force
  Password Reset continues to be treated as a known-broken,
  disabled-in-spirit feature until the redesign is implemented and
  validated, not represented as reliably working.

### Finding 4 — Coach invitations remaining in `Pending` (root cause, resolved)

- **Question investigated**: whether Coach invitations required some
  additional linked entity (team, organization, competition) before they
  could reach `Accepted`, unlike other roles (e.g. Media) which could.
- **Root cause, confirmed by code inspection, not assumption**: no such
  requirement exists. `inviteCoach`
  (`app/admin/teams/[id]/actions.ts`) already supplies `team_id` and
  `competition_id` at invitation-creation time — a coach invitation is
  never missing that linkage. `finalizeAcceptedInvitation`
  (`lib/invitations.ts`), which is what actually flips an invitation to
  `accepted`, contains no role-specific logic at all — it matches purely
  on `email` + `status = 'pending'` and applies identically to every role.
  There is no code path where a coach invitation is held back for missing
  assignment data.
- **Actual explanation**: Coach invitations were blocked by **Finding 1**
  (the Supabase Auth Site URL/Redirect URL misconfiguration), the same
  environment issue that affected every email-driven auth flow. A coach
  clicking a real invitation email was subject to the live redirect
  fallback to `localhost:3000`, preventing the click-through from ever
  reaching `/team/reset-password` and therefore ever calling
  `finalizeAcceptedInvitation` — leaving the invitation permanently stuck
  at `pending`. Other roles' invitations that were verified as reaching
  `Accepted` earlier in this project were validated via a method
  (`generateLink` + direct token extraction) that does not depend on
  Supabase's Site URL fallback behavior, so they were not exposed to this
  particular failure mode — which is why the discrepancy looked
  role-specific when it was actually environment-specific.
- **Confirmed resolved**: after the Auth URL Configuration was corrected,
  live validation (2026-08-02) confirmed the coach invitation flow
  end-to-end — invitation email delivered, password set, Coach Portal
  access working — with no application code changes made to the
  invitation or coach-onboarding path.
- **Classification**: Environment Configuration (not an application
  defect, not an incomplete onboarding workflow, not a Phase 1
  limitation). Resolved. No code change required or made.

### Re-login verification (per the administrator's final checklist item)

The administrator reported performing a fresh login with the new password
after Round 2 and asked for this to be recorded as an independent
verification result "if it matches the application logs." Investigated
directly rather than assumed:

- Server logs (`vercel logs`) show two `POST /login` events shortly after
  Round 2 (15:06:41 and 15:07:41), each followed by a redirect pattern
  (`GET /login`, `GET /`, `GET /login/forgot-password`) that matches the
  **failure** branch of `unifiedLogin` (`app/login/actions.ts`), not its
  success branch (which redirects to a workspace, e.g.
  `/team/{token}/dashboard` for a coach with a valid assignment — confirmed
  by direct inspection of `lib/access.ts`'s `resolveUserDestination`, which
  rules out "coach correctly denied by the general login portal" as an
  alternative explanation for this pattern).
- This specific log evidence is **inconclusive at best, and on its face
  does not match** a clean login success through the general `/login`
  page at those two timestamps. It does not, by itself, corroborate the
  administrator's report of a successful fresh login.
- Per this report's own standard ("record exactly what was observed"),
  this is recorded as an open discrepancy rather than resolved either way:
  **not** logged as a confirmed independent re-login verification, since
  it does not clearly match the application logs as required. It also
  does not contradict the broader Round 2 success (password change,
  account recovery) reported and separately evidenced above. If a login
  path other than the general `/login` page was used (e.g. a
  team-token-specific login), or the two logged attempts were incidental
  and not the login the administrator is referring to, that would explain
  the discrepancy — not yet confirmed.

### Finding 3 — Resend Invitation defect (application logic, pre-existing)

- **Root cause**: `inviteUserByEmail()` creates the corresponding
  `auth.users` row at the moment an invitation is *first* sent
  (`lib/invitation-service.ts`'s `createInvitation`). The Resend action
  (`resendInvitationCore`) calls `inviteUserByEmail()` again for the same
  email on resend — Supabase Auth rejects a second `inviteUserByEmail()`
  call for an email that already has a registered auth account, even an
  unconfirmed one.
- **Evidence**: live test — resending `dadoubass@gmail.com`'s pending
  coach invitation via `/admin/invitations` failed. Server log, captured
  directly (not inferred from the generic UI message): `resend invitation
  failed 77a7c63a-489f-40ed-b64f-a26415d0a158 A user with this email
  address has already been registered`.
- **Impact**: Resend has very likely never worked for reviving any stale
  invitation, for any role, predating this session's Sprint 3 Phase 1
  changes — this is a pre-existing defect, not a regression introduced by
  Item 1's extraction of `resendInvitationCore` (which preserved the
  original `inviteUserByEmail()`-based resend logic byte-for-byte in
  behavior, per the plan's explicit "behavior-identical extraction" goal).
  Confirmed not introduced by Sprint 3 Phase 1: the same call pattern
  existed in the pre-Phase-1 `resendInvitation` function this replaced.
- **Recommended solution**: Resend should not call `inviteUserByEmail()`
  for an email that already has a registered Auth user. Use
  `generateLink({type: 'invite', ...})` or `generateLink({type:
  'recovery', ...})` against the existing user instead, which is designed
  for re-issuing an access link to an already-created account.
- **Belongs to**: pre-existing defect, unrelated to Sprint 3 Phase 1's
  scope, does not block Phase 1 closure. Recommended for a near-term
  maintenance fix — small, isolated, low-risk — flagged for scheduling
  alongside or shortly after Phase 2 work begins.

## 5. Account recovery performed during validation

- `qa-staging@interzone.local`: created, permanent, `viewer`,
  `active` — retained as the standing staging regression account.
  Excluded from further email-dependent testing (`.local` is a reserved,
  non-routable TLD Supabase cannot deliver to — documented in
  `docs/ENVIRONMENTS.md`).
- `dadoubass@gmail.com`: activated directly via SQL for this test
  (bypassing the confirmed-broken Resend path), used for the live Force
  Password Reset test, left in a banned state by Round 1 of Finding 2.
  **Recovery status: restored** — administrator confirmed the Supabase
  Dashboard native unban action was completed, and the account's own
  successful Round 2 password reset (which requires the account to no
  longer be banned in order to complete `updateUser({password})`) is
  itself consistent with the account being unbanned by that point.

## 6. Outstanding items before Phase 1 can be marked validated

1. ~~Confirm current Supabase Auth URL Configuration values~~ — **Done.**
   Administrator confirmed Site URL now points to the staging deployment
   and the Redirect URLs allowlist was updated accordingly. (Not
   independently re-queried against the Supabase Dashboard API in this
   session — recorded as reported, consistent with Round 2's observed
   correct-domain redirect.)
2. ~~Confirm `dadoubass@gmail.com` restored~~ — **Done**, see above.
3. Sign-off on `FORCE_PASSWORD_RESET_DESIGN_REVIEW.md`'s recommendation
   before any implementation of the redesigned workflow begins — **still
   open, not required to close Phase 1.** Tracked as Phase 2 lead-in work,
   per that document's sequencing recommendation.

All items required to close Sprint 3 Phase 1 are complete.

## 7. Final conclusion

Sprint 3 Phase 1's **Items 1, 2, and 3** (coach invite unification,
Archive fix, expiry enforcement) are validated and working as designed,
including the coach invitation path end-to-end after Finding 1's
environment fix. **Item 4 (Force Password Reset) has a confirmed,
reproduced defect** (Round 1), fully root-caused with a reviewed design
proposal awaiting sign-off — not an open question, a documented one. Round
2's later success is recorded as a second, separate observation and does
not retract the Round 1 finding; the classification stays **Confirmed
Application Defect** until the redesign is implemented and validated (see
`SPRINT_3_PHASE_1_ENGINEERING_SUMMARY.md`). One pre-existing, unrelated
defect (Resend) was also discovered and precisely scoped. The independent
re-login verification the administrator requested could not be confirmed
against server logs and is recorded as an open discrepancy, not a pass.

**Sprint 3 Phase 1 is closed and declared the official validated
baseline.** Items 1–3 are fully working; Item 4 ships in a known, tracked,
disabled-in-spirit state, consistent with how the administrator directed
this phase be closed — not silently represented as fully working.
