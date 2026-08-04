# GGSP — Force Password Reset: Design Review

Formal review requested after live Sprint 3 Phase 1 validation surfaced a
confirmed sequencing deadlock in the original implementation (see
`SPRINT_3_PHASE_1_VALIDATION_REPORT.md`, Finding 2). Compares the current
implementation, the interim fix proposed during live triage, a
research-informed alternative, and recommends a target design. **No code
has been changed as a result of this document** — implementation is
explicitly gated on review of this proposal.

## Correction to my own earlier proposal, made before finalizing this review

While researching "what does Supabase officially document about admin
session revocation" for this review, I found community-sourced material
(Supabase GitHub discussions, a third-party dev journal covering the
`ban_duration` feature) stating plainly: **a ban only blocks sign-in and
new session creation for its duration — it does not revoke already-issued,
already-active sessions.** My interim proposal (short-lived ban) assumed
this app's middleware — which calls `getUser()` live on every
protected-route request — would still cause an active session to fail
during the ban window. That assumption is now genuinely uncertain rather
than confirmed: `getUser()` validating a still-unexpired JWT and a ban
blocking *new* sign-in/recovery/refresh operations may be different code
paths inside Supabase Auth, and I could not confirm from official
reference documentation (fetched directly, not just search summaries)
whether ban status is checked on that specific validation path. **I'm not
asserting either way — flagging this as something the recommended design
below should not depend on being true.**

What *is* directly confirmed, from this session's own live test, not
secondhand: **a ban does block the recovery-token verification step**
(`#error=access_denied&error_code=user_banned` observed on a real click of
a real, successfully-delivered reset link). That fact alone is sufficient
to rule out the original design regardless of the open question above.

## Option A — Current implementation (confirmed broken)

Ban indefinitely (`ban_duration: "876000h"`) at the moment Force Password
Reset is triggered → send reset email → rely on `setNewPassword` calling
`restoreUserAccess()` after a successful password update to lift the ban.

**Verdict: rejected.** Deadlocks by design — step 3 (recovery-token
verification) is blocked by the very ban that step 4 depends on the user
getting past. Confirmed live, not theoretical. Leaves the account
permanently locked with no self-service recovery path, directly violating
"never leave the account permanently locked by the reset process itself."

## Option B — Short-lived ban + password rotation (my interim proposal)

Immediately rotate the password to a random, discarded value (unconditional,
no timing dependency — recovery never checks the old password, so this
never conflicts with it) **and** apply a short, self-expiring ban (seconds
to low minutes) instead of an effectively-permanent one.

**Pros**: minimal implementation change (one new field on the existing
`updateUserById` call, one duration constant); password-reuse prevention
is unconditionally correct; the ban self-expires, so there's no path to a
permanent lock; recovery succeeds on the first click in virtually all
realistic human timings, since the ban window will have already lapsed by
the time someone opens their email and clicks through.

**Cons**: "immediately invalidate every active session" is now an open
question rather than a confirmed property, per the correction above — if
bans genuinely don't affect already-issued tokens, this option provides
**no actual session invalidation at all**, only future-sign-in and
short-window recovery-blocking, which isn't what was asked for. Depends on
undocumented GoTrue internal behavior that could change between Supabase
versions with no notice, which is a real long-term maintenance risk for
"enterprise" use.

## Option C — Password rotation + direct refresh-token revocation (recommended)

Immediately rotate the password to a random, discarded value (same as
Option B — this part is correct and stays). **Separately**, immediately
revoke every one of that user's refresh tokens via a dedicated,
`security definer` Postgres function (new migration), called through
`supabaseAdmin().rpc(...)` — not through `ban_duration` at all.

```sql
-- Illustrative shape, not yet implemented:
create or replace function revoke_user_sessions(target_user_id uuid)
returns void
language sql
security definer
set search_path = auth, public
as $$
  delete from auth.refresh_tokens where user_id = target_user_id::text;
$$;
```

This is the pattern Supabase's own community documents as the correct way
to force-invalidate a user's sessions from the admin side, since no
GoTrue Admin API method for it is exposed in the currently-installed SDK
(confirmed by direct inspection of `node_modules/@supabase/auth-js` earlier
this session — the admin surface is `inviteUserByEmail`, `generateLink`,
`createUser`, `listUsers`, `getUserById`, `updateUserById`, `deleteUser`,
`signOut(jwt)` — the last of which requires already having the specific
session's JWT, which an admin never has for someone else's session, so
it's not usable here).

**Pros**: doesn't touch `banned_until` at all, so it structurally **cannot**
conflict with the recovery-token flow — zero deadlock risk, no short-window
race to reason about, no dependency on undocumented ban-scope behavior.
Once a refresh token is deleted, that device can never silently renew its
session again; it must obtain a brand-new one, which requires either the
new password or the recovery link. This is the closest match to "immediately
invalidate every active session" that Supabase's actual architecture
supports.

**Cons**: more implementation work than Option B — a new migration, a
`security definer` function touching the `auth` schema (requires care:
correct function ownership/permissions, and this schema is Supabase-managed,
so any change here should be reviewed against Supabase's own guidance
before shipping). Still cannot retroactively invalidate an **access token**
already issued and not yet expired — no admin action anywhere can do that,
for any Supabase project, because access tokens are stateless JWTs
validated by signature and expiry alone. This is a property of JWT-based
auth generally, not a gap specific to this design; the practical mitigation
is keeping the project's access-token lifetime short (a separate, existing
Supabase Auth Settings value, not something this feature controls) so the
exposure window after a revocation is bounded and small regardless of
which option is chosen.

## Option D — Client-initiated global sign-out (not applicable)

Supabase's own documented `scope: 'global'` sign-out
(`auth.signOut({scope: 'global'})`) is real and does terminate every
session for a user — but it's called *by that user's own authenticated
client*, using their own valid session. An admin has no way to invoke it
on someone else's behalf. Included here only for completeness — not a
candidate.

## Comparison

| Requirement | A (current) | B (interim) | C (recommended) |
|---|---|---|---|
| Immediately invalidate active sessions | No — deadlocks before this matters | Uncertain — depends on unconfirmed ban scope | Yes — refresh tokens deleted directly, doesn't depend on ban semantics |
| Prevent continued use of current password | Yes | Yes | Yes |
| Always allow reset completion | **No — confirmed broken** | Yes, in realistic timings | Yes, unconditionally — never touches ban at all |
| Never permanently locked by the process | **No — confirmed broken** | Yes | Yes |
| Aligned with Supabase's security model | N/A (broken) | Partial — leans on undocumented behavior | Yes — matches Supabase community's own documented pattern for this exact need |
| Resistant to replay/bypass/recovery abuse | N/A (broken) | Yes (recovery token itself is Supabase's own single-use, time-limited mechanism, untouched) | Yes (same) |

## Recommendation

**Option C.** It's the only option that actually satisfies "immediately
invalidate every active session" without leaning on ban behavior that
isn't confirmed in official documentation, and it structurally eliminates
the deadlock class of bug entirely — there's no ban/recovery interaction
to reason about at all, so this can't regress the same way again even if
Supabase changes `ban_duration`'s internals in a future release.

**Sequencing recommendation**: since Option C requires new schema work
(a migration, careful `security definer` function review) and Sprint 3
Phase 1 is otherwise ready to close, treat the Option C implementation as
the first item of the maintenance/hardening work queued alongside Phase 2,
not a blocker to closing Phase 1 — provided Force Password Reset itself
stays disabled or clearly marked unfinished in the interim, since Option A
(the currently-shipped version) is confirmed broken and should not be
presented as a working feature. Do not ship Option B as a permanent
substitute — its "uncertain" cell above is a real gap, not a rounding
error, for something explicitly framed as an enterprise security control.
