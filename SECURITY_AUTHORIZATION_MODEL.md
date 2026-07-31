# GGSP — Authorization Model: Decision Record

Written to formally close Critical Finding #1 from the Enterprise Readiness
Review ("authorization has exactly one layer — the database has none").
This document is the deliberate decision, not a deferral.

## Current model

Every one of the ~19 application tables has Row Level Security **enabled**
with **zero policies** (`grep -rn "create policy" supabase/` returns nothing,
repo-wide). All data access — every read, every write — goes through
`supabaseAdmin()` (`lib/supabase-admin.ts`), which uses the Supabase
**service role key**. Every Server Action re-checks `requireAdmin()` /
`requireRole()` / `requireFoundationAccess()` / `requireCoach()` itself
before touching data.

The auth-aware client (`lib/supabase/server.ts`, anon key, respects RLS) is
used **only** for `supabase.auth.*` calls — sign in, sign out, get user,
update password, exchange a PKCE code. Verified directly, not assumed:

```
$ grep -rl "from \"@/lib/supabase/server\"" .          # 12 files
$ grep -n "createClient\(\)\." <each of those 12 files> # every call is .auth.*, never .from(...)
```

No file in the codebase queries a data table through the anon/authenticated
client.

## Why adding RLS policies would not actually reduce risk here

The Enterprise Readiness Review's original recommendation was "add baseline
RLS policies as defense-in-depth, or add an automated guard." Re-examining
during implementation: for *this specific architecture*, writing RLS
policies for the `anon`/`authenticated` Postgres roles would not change the
application's real risk profile, for two independent reasons:

1. **The service role bypasses RLS unconditionally, by Supabase's own
   design** — this is not a policy gap, it's what the service role key
   *is*. No policy written for `anon`/`authenticated` changes what the
   service-role client can do. The actual exploitable surface is entirely
   "does this Server Action call its guard" and "is the service-role key
   itself exposed" — neither is addressed by writing more RLS policies.
2. **RLS-enabled-with-zero-policies already denies all `anon`/
   `authenticated` access by default.** Postgres's RLS default is deny, not
   allow. Since the app never queries as `anon`/`authenticated` in the first
   place, there is no accidental-exposure path through that client for
   policies to close — it's already closed, today, by the current
   configuration.

Writing RLS policies here would be security theater: real-looking,
resume-shaped, and inert. The two things that actually matter are the two
things fixed instead:

## What was implemented instead

1. **Automated authorization-gate coverage** (`tests/security/action-gates.test.ts`).
   The previous version of this test asserted a *hand-maintained list* of
   "protected" action files — and that list had already silently drifted:
   `app/admin/settings/actions.ts` calls `requireAdmin()` in real code but
   was never added to the list, so a regression removing that call would
   have shipped undetected. The test now scans every `app/**/actions.ts`
   file on disk directly and fails if any file lacks a recognized
   authorization call, unless it's in a small, reason-documented exemption
   list (the handful of genuinely pre-authentication flows: login,
   forgot-password, reset-password, select-workspace). New action files can
   no longer ship unguarded without either adding the gate or explicitly
   justifying why not. Verified by deliberately removing `requireAdmin()`
   from `admin/settings/actions.ts` and confirming the test fails with a
   specific, actionable message, then restoring it.

2. **Service-role key isolation is enforced, not just conventional.**
   `lib/supabase-admin.ts` begins with `import "server-only"` — a build-time
   guard that throws if the module is ever imported into client-bundled
   code, not just a comment asking developers not to.

## Residual risk (accepted, not hidden)

- If the service-role key itself leaks (committed to git, logged, exposed
  via a misconfigured env var), there is no database-level backstop —
  this is inherent to using a service-role-key architecture at all, and is
  mitigated operationally (secret rotation, `.gitignore` on `.env*`,
  confirmed present) rather than by database policy.
- The action-gate test is a regex-based static check, not a runtime proof —
  it can be fooled by a comment that happens to contain a guard function's
  name (this was discovered while writing it: a comment in
  `app/team/[token]/login/actions.ts` mentioning `requireCoach()` produced
  a false match during an early check). It catches the realistic regression
  (a gate call quietly deleted) but is not a substitute for code review on
  new action files.

## Decision

No RLS policies will be added. This is a conscious choice, made after
verifying the actual data-access pattern, not an oversight carried forward.
