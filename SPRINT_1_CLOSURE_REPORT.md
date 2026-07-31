# GGSP — Sprint 1 Closure Report

Prepared at the conclusion of the Sprint 1 Stabilization & Remediation
phase, following the Enterprise Readiness Review. This report exists to
answer one question directly: **can Sprint 1 close, or not** — with
evidence, not reassurance.

---

## 1. Completed work this phase

### Critical findings — both resolved

**Critical #1 — Authorization had exactly one layer.** Re-examined rather
than mechanically actioned: writing RLS policies for `anon`/`authenticated`
roles would not have reduced real risk here, because (a) the service-role
key bypasses RLS unconditionally by Supabase's design, and (b) the app was
verified, file by file, to never query data tables as `anon`/`authenticated`
— only for `.auth.*` calls. RLS-enabled-with-zero-policies already denies
those roles by default, so there was no accidental-exposure gap for
policies to close. Writing them would have been security theater.

What actually closes the real gap — implemented:
- `tests/security/action-gates.test.ts` rewritten from a **hand-maintained
  allowlist** (which had already silently drifted — `app/admin/settings/
  actions.ts` calls `requireAdmin()` in real code but was never in the old
  list) to an **auto-discovering scan** of every `app/**/actions.ts` file.
  A new action file can no longer ship without an authorization gate or an
  explicit, reasoned exemption. Verified by deliberately deleting a real
  guard call and confirming the test fails with a specific message, then
  restoring it.
- Full reasoning recorded in `SECURITY_AUTHORIZATION_MODEL.md`, including
  the residual risk that's accepted (service-role key exposure — mitigated
  operationally, not by database policy) and the test's own known
  limitation (a regex-based check can be fooled by a comment, discovered
  firsthand while writing it).
- This decision is consistent with, not a departure from, this project's
  own history: migration `005_iam_hardening.sql` reached the identical
  conclusion for `audit_logs` immutability three sprints ago ("RLS + no
  policies only stops anon/authenticated clients; the service-role client
  bypasses RLS by design, so RLS alone was never a real guarantee").

**Critical #2 — The revalidation bug was fixed in 2 files, identical in 5 more.**
Fixed at the root, not file-by-file, per instruction: `lib/foundation.ts`
now exports `revalidateFoundation()`, and all **7** Foundation CRUD action
files (`competitions`, `organizations`, `seasons`, `divisions`, `stages`,
`groups`, `venues` — 17 call sites total) call it instead of each
hand-rolling `revalidatePath()`. A regression test
(`tests/characterization/architecture-guards.test.ts`) asserts every one of
the 7 files contains no raw `revalidatePath(` call at all — the fix can't
silently regress per-file again.

### High findings — all four resolved or explicitly deferred with mitigation

| # | Finding | Disposition |
|---|---|---|
| 3 | Three duplicate Modal implementations, already drifted in a11y | **Implemented.** Consolidated into `components/ui/Modal.tsx`; the two directory-local files and the inline copy in `ConfirmActionDialog` now compose it. Zero call sites changed — visual output is identical, only the accessibility drift (missing `role`/`aria-modal`) is fixed. Guarded by a regression test. |
| 4 | Zero test coverage on the two areas that broke tonight | **Partially implemented, rest explicitly deferred.** Added targeted regression tests for the two confirmed bugs (revalidation scope, RSC server/client boundary) plus the schema.sql staleness and Modal duplication findings — 21 new tests. **Deferred to Sprint 2, with reason:** full behavioral test suites for the `lib/broadcast/*` engine chain and Foundation CRUD business logic. Reason: that's a multi-day effort disproportionate to a stabilization phase; interim mitigation is the new action-gate coverage test (Critical #1) plus the UAT guide's manual test checklist. |
| 5 | `schema.sql` documented 5 of ~19 tables | **Implemented.** Regenerated from all 6 migration files (base tables + every `alter table` addition merged per table) — now documents all 19 tables accurately, with the migrations explicitly stated as the authoritative source if they ever disagree again. Guarded by a regression test that fails if a table from the migrations is missing from `schema.sql`. |

### Technical validation

```
npm run typecheck   -> clean
npm run lint        -> clean, no warnings
npm test             -> 95/95 passing (was 74 before this phase; +21 new)
npm run build        -> succeeds, 45 routes, no errors
```

Full clean rebuild performed (`.next` and `node_modules/.cache` both
cleared) to rule out any cache masking a real failure, consistent with
tonight's earlier lesson that a cache clear can hide — or fake — a result.

### Architecture re-validation

Re-checked specifically because this phase touched shared modules:
module boundaries, imports, and server/client boundaries on the new
`lib/foundation.ts` export and `components/ui/Modal.tsx` — both correctly
scoped (`lib/foundation.ts` stays server-only via `import "server-only"`;
`components/ui/Modal.tsx` correctly carries `"use client"`). No new
circular imports introduced by the Modal consolidation or the
`revalidateFoundation` helper.

### Documentation

- `supabase/schema.sql` — regenerated (High #5).
- `SECURITY_AUTHORIZATION_MODEL.md` — new, records the Critical #1 decision.
- This report.

---

## 2. Remaining known issues

**Coach dashboard notifications mix one hardcoded item with real ones,
indistinguishably.** Found during this phase's product stability pass,
not previously reported. `app/team/[token]/(coach)/dashboard/page.tsx`
builds a notification list from genuine data (next match, submission
receipt) but always appends one static item — `"Mesaj Administratè:
Tanpri konfime kapitèn ekip la anvan match la"` — rendered in the exact
same style as the real ones, with nothing telling the coach it isn't an
actual message. This is different from the Settings page's Notifications
section, which is honestly labeled "Preview only." **Not fixed in this
phase** — deciding whether to remove it, make it real, or label it is a
product call, not a mechanical bug fix, and making that call unilaterally
during a stabilization pass risked exactly the scope creep this phase was
scoped to avoid. Flagging it here instead of hiding it.

No other partially-implemented feature was found across the reviewed
workflows (authentication, authorization, competitions, organizations,
seasons, stages, groups, venues, broadcast center, coach portal, profile
management, live alerts, role management, dashboard interactions) beyond
what was already disclosed in `UAT_TESTING_GUIDE.md`'s Known Limitations
section (placeholder panels, vMix/Website Sync architecture-only,
GO LIVE execution deferred) — all of which remain accurately labeled as
such, not silently broken.

---

## 3. Technical debt (tracked, not blocking)

Carried forward from the Enterprise Readiness Review, still valid:

- **Medium** — naming collisions (`StatusBadge.tsx` and `EmptyState.tsx`
  both exist twice, in different directories, for different domains).
- **Medium** — Foundation CRUD is still ~700 lines of structurally
  repeated create/rename/delete/setStatus per entity; the shared
  `revalidateFoundation()` helper fixes the one bug that pattern caused,
  but the broader duplication (and the risk of a *different* bug needing
  the same six-file treatment later) remains.
- **Medium** — no external observability; failures are `console.error`'d
  and surfaced via `?error=` query params, with nothing forwarding to a
  monitoring service.
- **Low** — `supabase/deploy/packages/*.deploy.sql` and
  `supabase/migrations/*.sql` are two hand-synced representations of the
  same schema changes; nothing currently verifies they stay in sync.
- **Low** — the coach token model has no rotation/expiry path (already
  disclosed in the UAT guide).
- **Low** — the new action-gate test is regex-based and can be fooled by a
  comment containing a guard function's name (discovered and documented
  honestly in `SECURITY_AUTHORIZATION_MODEL.md`); it catches the realistic
  regression (a call quietly deleted) but isn't a substitute for review on
  new files.

None of these block Sprint 1 closure. All are appropriate Sprint 2 backlog
items.

---

## 4. Risks

- **Full broadcast-engine and Foundation-CRUD test coverage remains
  deferred** (High #4's partial deferral). If Sprint 2 modifies
  `lib/broadcast/*` or adds an 8th Foundation entity, there is no automated
  behavioral safety net beyond the authorization-gate and revalidation
  guards added this phase. Mitigation: the UAT guide's manual checklist,
  and this report's explicit flag so it isn't forgotten.
- **Service-role key exposure remains a single point of failure**, by
  architecture, not oversight (see `SECURITY_AUTHORIZATION_MODEL.md`).
  Mitigated operationally (`.env*` gitignored, confirmed; `server-only`
  import guard on `lib/supabase-admin.ts`, confirmed) but not by the
  database.
- **The coach notification panel issue** (Section 2) is low-severity but
  user-facing and Haitian-Creole-language-facing — worth a decision before
  real coaches use it in production, not just this UAT session.

---

## 5. Production readiness assessment

**Not a blanket "production ready,"** but meaningfully different from
before this phase: every Critical and High finding from the Enterprise
Readiness Review now has either a real fix or an explicit, reasoned
deferral — nothing is ambiguous, per the instruction. Specifically:

- The two real bugs found in tonight's UAT (RSC boundary violation,
  revalidation scope) are fixed **and** regression-tested.
- The one architectural question worth challenging (RLS vs. no RLS) was
  actually re-examined, not rubber-stamped — and the conclusion is
  consistent with this project's own prior precedent.
- The full quality gate is green on a clean rebuild, not a cached one.
- What remains open (full engine test coverage, CRUD duplication, the one
  coach-notification issue) is disclosed, not hidden, and is normal
  Sprint 2-scope work, not a Sprint 1 defect.

## 6. Recommendation

**Sprint 1: Ready to Close.**

Both Critical findings are resolved. All four High findings have either a
real fix or an explicit, mitigated deferral — none are ambiguous. The
quality gate is green on a from-scratch rebuild. The one newly-found issue
(coach notification panel) is Low/Medium severity, disclosed rather than
hidden, and is a product decision, not a stability blocker.

Sprint 2 planning — the "GGSP Enterprise Product Specification v2.0" — can
begin.
