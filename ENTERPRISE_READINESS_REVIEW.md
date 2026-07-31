# GGSP — Enterprise Readiness Review

Independent architecture audit, performed as if by a Senior Enterprise Software
Architect with no prior involvement in this codebase. Every finding below is
backed by a specific file, line, or command — nothing here is a general
impression. Where the existing implementation is sound, that's stated
explicitly too; this is not a document optimized to find problems.

Scope: the full application as it stands tonight — ~200 source files, 20
database tables across 6 migrations, the admin console, the coach portal, and
the Broadcast Center / Readiness / Tactical Formation subsystem.

---

## Executive summary

The platform is more disciplined than most codebases at this stage —
particularly its refusal to fake integration state (vMix, Website Sync,
GO LIVE) and its privilege-edge-case handling (last-super-admin lockout,
self-lockout protection). But it has exactly one architectural decision that
is worth challenging outright (Finding 1: zero database-level authorization),
and one live, unfixed instance of tonight's own confirmed UAT bug hiding in
plain sight (Finding 2). Everything else is normal, addressable technical
debt for a Sprint 1 codebase — not a crisis.

**Do before Sprint 2 starts:** Findings 1 and 2.
**Should schedule into Sprint 2 directly:** Findings 3–5.
**Track, don't block on:** everything else.

---

## Critical

### 1. Authorization has exactly one layer — the database has none

Every one of the ~19 application tables has Row Level Security **enabled**
but carries **zero policies**:

```
$ grep -rn "create policy" supabase/
(no results — repo-wide)
```

`supabase/schema.sql`'s own header is explicit about this being intentional:
*"Row Level Security is enabled on every table with NO public policies...
All application access happens server-side using the service role key."*
Every Server Action does correctly re-check `requireRole()` /
`requireAdmin()` / `requireFoundationAccess()` itself (confirmed across
16 action files) — that's real defense, and better than relying on
middleware alone. But it is defense of one kind, at one layer, written by
hand, ~20 separate times.

**Risk:** the service-role key bypasses RLS entirely by design. If any
future Server Action (Sprint 2 will add more — Media Center, AI modules per
the roadmap) omits its `requireX()` call, or if the service-role key is ever
exposed (logged, committed, misconfigured env var), there is **no second
line of defense** — not "degraded," not "logged," nothing stops the read or
write. A platform whose roadmap explicitly includes "AI modules" and
third-party integrations should not have its entire authorization model
resting on every future contributor remembering one function call, every
time, forever.

**Recommendation:** before Sprint 2 adds surface area, do one of:
- Add baseline RLS policies (even coarse ones — "role X can touch rows where Y") as a real second layer, or
- Add an automated check (a test, or a lint rule) that fails if any file under `app/**/actions.ts` lacks a `requireRole|requireAdmin|requireFoundationAccess` call — cheap insurance against exactly the failure mode above.

Either is acceptable. Shipping neither into Sprint 2 is the real risk.

---

### 2. The exact bug UAT just found is still live in 5 more files

Tonight's UAT surfaced "competitions don't refresh without a manual
workaround." Root cause: `revalidatePath("/admin/competitions")` only
invalidated that one path, leaving every *other* page's competition
dropdown stale. That was fixed in `competitions/actions.ts` and
`organizations/actions.ts` earlier tonight.

**The identical pattern, unfixed, exists in 5 more files:**

```
app/admin/seasons/actions.ts:     revalidatePath("/admin/seasons")     × 4
app/admin/divisions/actions.ts:   revalidatePath("/admin/divisions")   × 3
app/admin/stages/actions.ts:      revalidatePath("/admin/stages")     × 3
app/admin/groups/actions.ts:      revalidatePath("/admin/groups")     × 3
app/admin/venues/actions.ts:      revalidatePath("/admin/venues")     × 3
```

Seasons, divisions, stages, groups, and venues all feed selectors on other
admin pages (e.g. the venue picker when scheduling a match). This is not a
theoretical risk — it's the same reproduced-tonight bug, confirmed present,
just not yet reported because nobody has created a season/division/stage/
group/venue and then gone looking for it elsewhere yet. Recommend applying
the identical `revalidatePath("/", "layout")` fix to all 5 files before
closing Sprint 1 — it's the same one-line change, already proven safe by
tonight's typecheck/lint/test/build pass on the first two.

---

## High

### 3. Three independent re-implementations of the same modal, already drifted

`components/foundation/Modal.tsx`, `components/live/Modal.tsx`, and an
inline reimplementation inside `components/iam/ConfirmActionDialog.tsx` all
build "centered overlay, backdrop click closes, Escape closes." They are not
shared — they're three separate hand-written copies, and they've already
diverged:

| | `role="dialog"` / `aria-modal` | visible close (X) button | max width |
|---|---|---|---|
| `foundation/Modal.tsx` | ✅ | ❌ | `max-w-lg` |
| `live/Modal.tsx` | ❌ | ❌ | `max-w-sm` |
| `iam/ConfirmActionDialog.tsx` (inline) | ✅ (`alertdialog`) | ✅ | `max-w-sm` |

Earlier this session, a real click-outside/ESC interaction audit was done
across the app — and this is exactly the kind of fix that has to be applied
three times instead of once, with a real chance of missing one (as the
accessibility attributes show already happened). This is the UI-layer
equivalent of Finding 2: duplication that has already produced drift, not
a hypothetical.

**Recommendation:** consolidate to one `Modal` primitive with an optional
`variant` prop (`sm`/`lg`) and a `showCloseButton` flag; have
`ConfirmActionDialog` compose it instead of reimplementing the overlay.

### 4. Zero automated coverage for the two areas that actually broke tonight

74 tests pass, and they're well-aimed at what they cover — RBAC gates,
readiness scoring, audit integrity, auth redirects. But:

- The entire `lib/broadcast/*` engine chain (`BroadcastEngine`, `ScoreEngine`, `EventEngine`, `GraphicsEngine`, `VMixEngine`, `AutomationPipeline`, `WebsiteSync`) — the platform's own "frozen architecture" — has no test file anywhere.
- Every Foundation CRUD action file (`competitions`, `organizations`, `seasons`, `divisions`, `stages`, `groups`, `venues`, `teams`, `matches` — ~700+ lines) has no test file.

Both real bugs found in tonight's UAT (the RSC server/client boundary
violation, and the `revalidatePath` scope bug) lived in exactly this
untested code, and **neither has a regression test yet**, even after being
fixed — meaning either could silently regress in Sprint 2 with nothing to
catch it.

**Recommendation:** two small, targeted tests before Sprint 2: one asserting
every Foundation mutation calls the broad revalidation path, one asserting
`lib/live-alerts.ts` has no `"use client"` directive (a one-line regression
guard for Finding from tonight's runtime error — cheap and durable).

### 5. `supabase/schema.sql` documents 5 of ~19 tables

`schema.sql` is the only "whole schema in one place" artifact in the repo,
and it dates from the Sprint 1 baseline — `competitions`, `teams`, `players`,
`matches`, `lineups`. Migrations 002–007 since added `match_events`,
`profiles`, `user_access_assignments`, `invitations`, `audit_logs`,
`role_metadata`, `organizations`, `seasons`, `divisions`, `stages`,
`competition_groups`, `venues`, `tactical_formations`, `tactical_positions`
— 14 tables with no consolidated reference. A new engineer (or the
architect this review assumes will audit Sprint 1 next) has to mentally
replay 6 migration files in order to know what the real schema is.

**Recommendation:** either regenerate `schema.sql` from the live database as
a build/CI step, or delete it and say so explicitly — a stale "source of
truth" is worse than no consolidated file at all.

---

## Medium

### 6. Naming collisions invite wrong imports

Two files are both named `StatusBadge.tsx` — `components/ui/StatusBadge.tsx`
(lineup status: submitted/waiting/needs_correction) and
`components/iam/StatusBadge.tsx` (access status: invited/active/suspended/
disabled/archived, exported as `UserStatusBadge`). Two files are both named
`EmptyState.tsx` — `components/ui/EmptyState.tsx` (full-page card with a CTA)
and `components/live/EmptyState.tsx` (a tiny inline placeholder with a
completely different prop shape). Nothing stops an editor's auto-import from
picking the wrong one; only naming discipline does. Recommend renaming by
domain (`LineupStatusBadge` / `AccessStatusBadge`) rather than relying on
directory alone to disambiguate.

### 7. Foundation CRUD is ~700 lines of the same pattern, six times over

`organizations`, `seasons`, `divisions`, `stages`, `groups`, and `venues`
each independently implement create → validate slug → mutate → audit →
`revalidatePath` → redirect, entity by entity. This isn't urgent on its own
— three similar files would be fine left alone — but at six copies it's the
direct root cause of Finding 2: the same bug had to be fixed once and
should have been fixed six times, and wasn't, because there's no shared
implementation to fix centrally. Worth a shared `createFoundationEntity()`
style helper in Sprint 2, not as a purity exercise but because it would have
made tonight's bug a one-file fix instead of a six-file audit.

### 8. No observability beyond `console.error`

Every action failure is caught, `console.error`'d, and surfaced to the user
via a `?error=` query param — which is good UX discipline (specific,
honest error messages, confirmed across `ERROR_MESSAGES` maps in every
admin page). But nothing forwards failures anywhere durable. In a real
production deploy, a failing Server Action is invisible until someone reads
raw server stdout. No blocker for Sprint 1; worth a line item before this
goes further than tonight's UAT.

### 9. Deploy packages and migrations are two hand-synced representations of the same change

`supabase/deploy/packages/*.deploy.sql` are preflight-guarded, idempotent
runners — a reasonable, deliberate pattern for safe repeated deploys, not
duplication for its own sake. But they are structurally different files from
`supabase/migrations/*.sql` describing the same schema changes, and nothing
currently verifies the two stay in sync as migrations evolve. Worth a
lightweight check (even a comment convention or a diff-on-CI) before this
drifts silently.

---

## Low

### 10. Minor N+1 in workspace resolution

`resolveUserDestination()` → `optionForAssignment()` issues one Supabase
query per active assignment via `Promise.all`. Bounded and harmless at
today's scale (1–3 assignments per user); would only matter if a user is
ever granted many roles at once. Not worth fixing now — noted for scale
awareness only.

### 11. Coach link model has no rotation or expiry path

Already honestly documented in tonight's UAT guide, restated here because
an independent audit should flag it once more explicitly: `teams.token` has
no expiry and no regenerate function. Fine for tonight's controlled UAT;
before any real coach receives a production link, a rotate/invalidate path
is worth having.

---

## Explicit strengths (not just criticism)

- **Server Actions defend themselves.** Every action re-checks
  `requireRole`/`requireAdmin`/`requireFoundationAccess` rather than trusting
  middleware alone — the right instinct, even though Finding 1 shows the
  layer beneath it is still missing.
- **Privilege edge cases are genuinely well handled.** Last-super-admin
  lockout and self-lockout protection (`lib/privilege.ts`) are not something
  most Sprint-1-stage codebases get right; this one does, with clear,
  specific error messages rather than a generic 403.
- **FK design is sound.** Cascades follow the real hierarchy
  (competition → season → division → stage → group), softer references
  (`organization_id`) correctly use `on delete set null` instead of cascading
  — no orphan-row risk found anywhere in the schema.
- **Honesty discipline is real, not just documentation.** Readiness scoring,
  vMix, and Website Sync consistently report `not_tracked` / `planned` /
  `not_configured` instead of faking a pass — confirmed in code, not just in
  the UAT guide's claims about it. This is unusual restraint for a platform
  with this much roadmap ambition and is worth explicitly preserving as a
  house rule into Sprint 2.
- **Dependency footprint is lean.** 7 runtime dependencies, 10 dev
  dependencies, no framework sprawl. Worth protecting deliberately once
  Sprint 2's Media Center / AI module work starts pulling in new packages.

---

## Coverage against the requested review lenses

| Lens | Verdict | Reference |
|---|---|---|
| Architecture consistency | Sound; layered broadcast engine holds up | — |
| Module boundaries | One real violation (server/client, now fixed) | tonight's `deriveLiveAlerts` fix |
| Database design & relationships | Sound FK design; documentation stale | Finding 5 |
| Security & authorization | Single-layer by design | **Finding 1** |
| Role-based access | Well handled, including edge cases | Strength |
| Data integrity | No orphan-row risk found | Strength |
| UI consistency | Real, evidenced duplication | Findings 3, 6 |
| UX workflow | No confusing workflow found this pass | — |
| Performance | One bounded N+1, no other concern | Finding 10 |
| Error handling | Consistent but not observable externally | Finding 8 |
| Build quality | Clean typecheck/lint/test/build tonight | — |
| Technical debt | Concentrated in Foundation CRUD duplication | Findings 2, 7 |
| Scalability | Not yet tested at load; no red flags in design | — |
| Maintainability | Main risk is duplication-driven bug spread | Findings 2, 3, 7 |
| Broadcast workflow | Consistently honest about what's real vs. planned | Strength |
| Coach workflow | Simple, works; token model needs a rotation story eventually | Finding 11 |
| Admin workflow | Functional; refresh bug was the one real defect | Finding 2 |

---

## Recommended sequencing

1. Fix Finding 2 (5-file `revalidatePath` fix) — mechanical, already proven safe tonight.
2. Decide on Finding 1's remediation path (RLS policies vs. an automated guard) — this is a decision, not just a fix, and should be made deliberately rather than deferred by default.
3. Findings 3–5 scheduled explicitly into Sprint 2's plan rather than lost in the backlog.
4. Findings 6–9 tracked; address opportunistically as those files are touched.
5. Findings 10–11 noted for future awareness; no action needed now.

Sprint 1 can close once 1 and 2 have an explicit decision — fixed, or
consciously deferred with a reason. Everything else here is normal,
well-understood debt for a codebase at this stage, not a blocker.
