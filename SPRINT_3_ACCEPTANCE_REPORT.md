# GGSP — Sprint 3 Acceptance Review Response

Written against the six-priority acceptance review, then closed out against
the follow-up instruction to verify all twelve remaining acceptance
scenarios in a real browser before commit. Every item below was either
verified against the current codebase (not assumed) or fixed and then
re-verified in a real browser against the local dev server.

**Final status: Sprint 3 is production-ready.** Every acceptance scenario
listed by the user has passed real browser verification. Four real,
previously-undiscovered bugs were found and fixed during this closing pass
(listed under "Second pass" below), on top of the fixes already made in the
first pass.

---

## First pass — the original six-priority review

### Priority 1 — Authentication & Email

**Password Recovery — fixed.** `requestUnifiedPasswordReset`
(`app/login/actions.ts`) and its Coach Portal twin
(`app/team/[token]/forgot-password/actions.ts`) previously discarded the
result of `resetPasswordForEmail()` entirely, always showing "check your
inbox" even on failure. `lib/auth-rate-limit.ts` now classifies the real
response; `components/auth/usePasswordResetAttempts.ts` adds an 8-attempt/
15-minute client-side guard on both forgot-password pages.

**Invitation Workflow — one real gap fixed.** `invitations.status` never
transitioned to `'expired'`. `lib/utils.ts`'s `effectiveInvitationStatus()`
now computes the status a person should actually see; `resendInvitation`
pushes `expires_at` forward on resend.

**Access Control — root cause found and fixed.** The real reason Broadcast
read as "inaccessible": `lib/readiness.ts`'s `ReadinessCheck.actionHref` was
a function, passed from a Server Component into a client component —
functions can't cross that boundary, so the entire Control Room crashed the
moment a specific match was opened, for every role. Fixed by resolving
every href to a plain string server-side.

**User Management — fixed.** Suspend/Disable rendered unconditionally
everywhere; a click only failed server-side, after the fact.
`lib/privilege.ts`'s `assertAccountStatusChangeSafe` closes the server-side
gap; the Users and Access pages now compute and hide the action instead of
showing then rejecting it.

**Command Center — no dead links found**; the review's claim traced back to
the same Priority 3 crash.

**Error Handling — one addition.** `app/error.tsx` now surfaces
`error.digest` as a support reference id.

---

## Second pass — the twelve acceptance scenarios, verified live

Per the explicit instruction not to rely on code inspection, every item
below was walked through in a real browser against `http://localhost:3000`,
using synthetic `qa-*-test@interzone.local` accounts created directly via
the Supabase Admin API (the platform owner's real account was never
touched). Where a flow required a real email link (invite acceptance,
password reset), `supabase.auth.admin.generateLink()` was used to produce
the actual action link a real email would contain, then that link was
exercised exactly as a user clicking it would.

### 1–2. Coach Portal onboarding & real invitation acceptance — passed, one critical bug found and fixed

Sent a real coach invitation through the admin UI (`/admin/invitations`),
generated the real Supabase action link for it, and completed acceptance.

**Critical bug found**: `/auth/callback` only read a `?code=` query
parameter (PKCE flow). This Supabase project's invite/recovery links
return the session as a URL **fragment**
(`#access_token=...&refresh_token=...`, implicit grant) — fragments never
reach the server, so `code` was always null and every real invite or
password-reset link showed "This link is no longer valid or expired,"
regardless of the send-side fixes from the first pass. This is the actual,
deeper root cause behind the original Priority 1 password-recovery
complaint.

**Fixed**: `app/auth/callback/route.ts` now falls back to a small
client-side bridge when no `code` is present — it reads the fragment,
posts the tokens to the new `app/auth/callback/session/route.ts`, which
establishes the real cookie session server-side via `setSession()`. Both
the `code` and fragment paths are handled; verified with real Supabase
action links for both a coach invite and a super_admin recovery link.

Full Coach Portal walkthrough after the fix: dashboard, lineup list,
formation, calendar, and profile pages all render correctly for a newly
onboarded coach; `/admin` and `/live` correctly redirect with "Your account
does not have access to that area."

### 3. Password reset from link to successful login — passed

Verified for a non-coach (super_admin) account using the same fixed
`/auth/callback` path: real recovery link → new password form → correct
landing on `/admin/dashboard` via `resolveUserDestination`.

### 4–5. Session refresh & logout — passed

Session persisted across navigation and a fresh browser tab. Sign out
correctly cleared the session; a subsequent direct request to
`/admin/dashboard` redirected to `/login` rather than rendering.

### 6–9. Coach / Referee / Media / Viewer permissions — passed, one bug found and fixed

Referee, Media, and Viewer accounts each landed on their correct workspace
and were blocked from admin/broadcast routes. **Bug found**: `viewer` had
no entry in `lib/access.ts`'s `ROLE_DESTINATION` map, so a real viewer
account with an active assignment got a misleading "not yet been assigned
access" message. Fixed with a new `app/viewer/page.tsx`, the missing map
entry, and two `middleware.ts` additions (`/viewer` in
`SESSION_ONLY_PROTECTED_PREFIXES` and the matcher).

### 10. Full Broadcast operator workflow — passed

Logged in as a broadcast_operator-only account, opened a real match, and
recorded a goal (with scorer), a yellow card, and a substitution through
the actual Control Room UI — not simulated. Score control, Match Timeline,
and the Graphics automation queue (Yellow Card auto-promoted to `LIVE`) all
updated correctly and consistently.

### 11. Public Match Center — passed, one crash and one downstream bug found and fixed

**Crash found**: `/match/[matchId]` (and, discovered while fixing it,
`/live/[matchId]/report`) threw `Cannot access second_yellow.tone on the
server` / `minuteSort is not a function`. Both pages are Server Components
that read a data property or called a function (`EVENT_META`, `minuteSort`)
imported from `"use client"` files (`components/live/MatchTimelineEvent.tsx`,
`components/live/Timeline.tsx`). Next's RSC compiler replaces every export
of a client module with a proxy for Server Components; reading a property
or calling a function on that proxy throws — this broke the Public Match
Center for *any* match containing a second-yellow event, and broke the
Broadcast report page for every match with any event at all.

**Fixed**: extracted `EVENT_META` and `minuteSort` into a new
`lib/event-meta.ts` — a plain module with no `"use client"` directive —
and repointed both Server Component consumers at it directly. A regression
test was added to `tests/characterization/architecture-guards.test.ts`,
mirroring the existing `deriveLiveAlerts` regression guard from Sprint 1,
so this class of bug can't silently return.

Verified after the fix: the Public Match Center renders the full match
state (score, live clock, complete timeline, statistics) with no
authentication required, and the Broadcast report page renders the full
categorized event breakdown (Goals/Cards/Substitutions/Full Timeline) plus
statistics and squads.

### 12. Platform Command Center navigation — passed

Walked every remaining sidebar destination not covered by earlier
passes — Settings, Audit Log, Matches, Teams, Lineups, Venues, Seasons,
Divisions, Stages, Groups — all render without error.

---

## Additional fix found during this pass (not in the original 12, reported by the user mid-session)

**Notification/profile dropdown transparency**: the admin header's
notification bell and profile menus used the same translucent-glass
`.surface-panel` style as every Card/Modal in the app, but — unlike
`Modal.tsx`, which sits on a full-screen `bg-black/70` scrim — these two
menus float directly over live page content with nothing dimming behind
them, so the 4.5%-opacity tint read as fully see-through. A second,
related bug in the same area: below the `sm` breakpoint, none of the
header's flex children carried the `ml-auto` needed to push the
notification/profile icons to the right edge, so the notification dropdown
(anchored `right: 0` to an icon sitting near the far left of a narrow
window) rendered mostly off-screen.

**Fixed**: added a `.surface-panel-solid` variant (`bg-surface-900/95`)
for floating menus with no backing scrim — used by the notification menu,
profile menu, `GoLiveButton`'s readiness popover, and `LiveAlerts` — and
added `ml-auto` to the notification menu's wrapper so the icon cluster
stays pinned to the header's right edge at every viewport width. Verified
visually at both a narrow (536px) and standard desktop (1280px) width.

**Profile photo not shown in the header**: also reported mid-session. The
admin header always rendered initials, never checking for an uploaded
avatar. `app/admin/layout.tsx` now passes `profile.avatar_url` through
`AdminShell` to `AppShell`, which renders the real photo when present and
falls back to initials otherwise. Verified live with a real image URL.

---

## Test accounts used for this review

All synthetic, `@interzone.local`, created directly via the Supabase Admin
API — never through the app UI with real credentials, never touching the
platform owner's account:

| Email | Role |
|---|---|
| `qa-admin-test@interzone.local` | super_admin |
| `qa-broadcast-test@interzone.local` | broadcast_operator |
| `qa-referee-test@interzone.local` | referee |
| `qa-media-test@interzone.local` | media |
| `qa-viewer-test@interzone.local` | viewer |
| `qa-coach-onboarding-test@interzone.local` | coach (MTK) |

Safe to leave in place for future testing, or archive from **Users** →
account → Disable.

---

## Quality gate

`npm run typecheck`, `npm run lint`, `npm run test` (131 tests, 13 files —
2 new regression tests added this pass), and `npm run build` all pass
clean with every fix above applied.

---

## Sprint 3 status: production-ready

Every blocking issue from the original acceptance review is resolved.
Every one of the twelve explicitly-requested acceptance scenarios has been
verified in a real browser, not inferred from code. Four additional real
bugs were found and fixed only by testing real links and real dev-server
behavior rather than trusting the code as written — most notably the
`/auth/callback` fragment-vs-code bug, which meant no real invite or
password-reset email could ever have completed successfully before this
fix, regardless of how correct the send-side code looked.
