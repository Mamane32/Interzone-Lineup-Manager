# GGSP — Sprint 3 Phase 2 Master Plan

**Status: planning only. No implementation is authorized by this
document.** Every item below requires separate, explicit approval before
any code is written, per standing instruction. This supersedes the Phase 2
outline sketched at the end of the original Sprint 3 Phase 1 plan, updated
with what live validation of Phase 1 actually surfaced.

Companion: `SPRINT_3_PHASE_1_ENGINEERING_SUMMARY.md` records Sprint 3
Phase 1 as the closed, validated baseline this plan builds on.

---

## 1. What changed since the original outline

The original Phase 2 outline was written before Phase 1 had been
live-tested. Live validation surfaced two things the original outline
didn't anticipate, both grounded in this session's direct code inspection,
not assumption:

1. **The invitation lifecycle needs a real redesign, not just the three
   targeted fixes Phase 1 shipped.** Phase 1 fixed archive, expiry, and
   coach unification — it didn't address revocation being irreversible,
   duplicate-invite handling for existing Auth users, or a Delete
   capability. Live testing (Resend's confirmed defect, Revoke's
   confirmed side effect below) showed these aren't cosmetic gaps.
2. **The Coach Portal's lineup workflow conflates two different jobs.**
   Live testing of the now-working coach onboarding flow surfaced that
   "Choose Player" assumes a roster that no coach-facing screen actually
   lets a coach build. This is a bigger, more valuable fix than originally
   scoped, and the administrator has marked it the preferred enterprise
   workflow going forward.

Both are added to this plan below. Multi-Language, the Interzone 2026
import work, Operations Overview, and Broadcast Experience remain in
scope, restated in §6–§9 with no material change.

---

## 2. Recommended implementation order (for approval)

| # | Item | Why here |
|---|---|---|
| 1 | **Invitation Management redesign** | Highest-leverage fix — Revoke currently destroys data irreversibly (§3.2), and every other role's onboarding depends on this module being correct before more roles are onboarded at volume |
| 2 | **Coach Portal: Roster vs. Match Lineup separation** | Now that coach onboarding is confirmed working end-to-end, this is the next thing an onboarded coach actually hits — and the administrator has called it the preferred workflow |
| 3 | **Multi-Language Foundation** | Platform-wide, and both items 1 and 2 above will need to be built with translation keys from the start rather than retrofitted — sequencing this after 1–2 risks re-touching the same UI twice |
| 4 | **Interzone 2026 Import Specification** | Design work only, no data changes — can proceed once the platform surfaces it lands on (invitations, coach portal, language) are stable |
| 5 | **Interzone 2026 Dataset Import** | Depends on #4's spec being approved |
| 6 | **Operations Overview** | Depends on Phase 1's lifecycle states (`archived`, `expired`, and the invitation redesign's new states) actually existing and being correct before they're surfaced platform-wide |
| 7 | **Broadcast Experience** | Independent of the above; lowest urgency signal from live validation this round |

Coach Support placement (§5) is small enough to fold into item 2's Coach
Portal work rather than stand alone — proposed there, not as a separate
numbered item.

This ordering is a recommendation, not a decision — flag any item you
want reprioritized before approval.

---

## 3. Item A — Invitation Management Module Redesign

### 3.1 Grounded findings (current state, verified by direct code reading this session)

- **Revoke currently deletes the underlying Supabase Auth user outright**
  (`app/admin/invitations/actions.ts`'s `revokeInvitation`:
  `admin.auth.admin.deleteUser(invite.invited_user_id)`). This makes
  revocation **irreversible** today — there is no account left to
  restore. The requested `Revoked → Restore` transition cannot be built
  on top of the current Revoke without changing what Revoke does first;
  see §3.2.
- **`invitation_status` has no `archived` value.** Current enum
  (`supabase/schema.sql`): `pending | accepted | expired | revoked`. The
  requested `Accepted → Archived` transition needs a new enum value —
  another additive, standalone migration, same discipline as `016`.
- **No existing-Auth-user detection exists.** `createInvitation`
  (`lib/invitation-service.ts`) always calls
  `admin.auth.admin.inviteUserByEmail()` unconditionally. This is the
  exact call that fails today for Resend (documented as a pre-existing
  defect in the Phase 1 Validation Report, Finding 3) — the same failure
  mode would hit a fresh `inviteUser` call for any email that already has
  an Auth account for any reason (a previous revoke-then-reinvite, a
  Force-Password-Reset-eligible existing user, etc.).
- **"Delete only if never accepted and no linked business data" is
  structurally already guaranteed by the existing status model, not
  something new to compute.** An invitation's `profiles`/
  `user_access_assignments` rows stay at `status = 'invited'` until
  `finalizeAcceptedInvitation` flips them — and every access gate in the
  app (`requireRole`, `requireCoach`, etc.) requires `status = 'active'`.
  A never-accepted invitation's user therefore could not have logged into
  any portal, added a player, submitted a lineup, or done anything else
  that would constitute "linked business data." **The safety check for
  Delete eligibility reduces to one condition: the invitation's status
  has never passed through `accepted`.** No cross-table scan for orphaned
  business data is needed — worth confirming against the schema at
  implementation time, but not expected to be a separate mechanism.
- **Existing per-user actions already cover most of the "Accepted" column
  requirement.** Reset Password (Force Password Reset, Phase 1),
  Disable/Enable (`updateUserStatus`), and Archive (Phase 1) already exist
  on `/admin/users/[userId]`. Item A's "Accepted" column requirements are
  largely already met by that page — the gap is specifically the
  `invitations`-table side (Pending/Revoked columns) and connecting the
  two views coherently, not rebuilding user management.

### 3.2 Proposed lifecycle redesign

Split what "Revoke" means today into two distinct, separately-reversible
actions:

- **Revoke** (redesigned): sets `invitations.status = 'revoked'`, disables
  the assignment row(s) it created, sets the profile to `disabled` — same
  as today, **except it no longer deletes the Auth user.** An unaccepted,
  revoked invitation's Auth account is left banned/disabled instead of
  destroyed, so it can be reversed.
- **Restore** (new): from `revoked`, reactivates the assignment(s) and
  profile back to `invited`, sets `invitations.status = 'pending'`. No new
  email required — the original invite link's underlying Auth account
  still exists, so restoring is a status flip, not a new invitation. (Open
  question for approval: should Restore also trigger a fresh
  `generateLink` email so the coach/user has a working link again, since
  the original email is presumably long gone? Recommend yes.)
- **Delete** (new, `Revoked` column only per your spec): only enabled when
  `invitations.status` has never been `accepted` (§3.1). Deletes the
  invitation row, the (already-disabled) Auth user, and any `invited`-status
  assignment/profile rows tied to it. This is the actual data-destroying
  action Revoke used to silently perform — now explicit, named correctly,
  and gated to the cases where it's actually safe.
- **Archive** (new, `Accepted` column, invitation-record side): once a
  user is `accepted` and later administratively archived (via the
  existing `/admin/users` Archive action), reflect that back onto the
  originating `invitations` row as `status = 'archived'` for a coherent
  audit trail — the invitation record shouldn't still read `accepted`
  once the account behind it is archived. Requires the new
  `invitation_status` enum value from §3.1.

### 3.3 State machine (every transition and its trigger, per your request)

| From | To | Trigger |
|---|---|---|
| — | `pending` | Admin sends a new invitation (`createInvitation`), or Restore revives a `revoked` one |
| `pending` | `accepted` | User completes password setup (`finalizeAcceptedInvitation`), invitation not expired |
| `pending` | `expired` | User completes password setup but `expires_at` has passed (Phase 1 behavior, unchanged) — **or** a scheduled/lazy check flips it independent of an acceptance attempt (not yet built — see open question below) |
| `pending` / `expired` | `pending` | Admin clicks Resend (`resendInvitationCore`) — revived, `expires_at` pushed out |
| `pending` / `expired` | `revoked` | Admin clicks Revoke (redesigned per §3.2 — no longer deletes the Auth user) |
| `revoked` | `pending` | Admin clicks Restore (new) |
| `revoked` | *(terminal, row removed)* | Admin clicks Delete (new, only reachable from `revoked`, only when never `accepted`) |
| `accepted` | `archived` | Admin archives the resulting user account from `/admin/users` (new: propagate back onto the invitation row) |

**Open question for approval**: today, `expired` is only ever written
*lazily*, at the moment someone actually tries to accept a lapsed
invitation (`finalizeAcceptedInvitation`) — there's no background job, so
an invitation that lapses and is never clicked again stays `pending`
forever in the admin list, just cosmetically shown as expired via
`effectiveInvitationStatus()`. Worth deciding whether Phase 2 should add a
real scheduled transition (a cron/edge function) so the admin list's
status column matches the DB, or whether the display-layer computation
already in place is good enough. Not blocking the rest of this redesign
either way.

### 3.4 Existing Auth user detection

Requirement: never call `inviteUserByEmail()` for an email that already
has an `auth.users` row; send a login/reset link to the existing account
instead.

Proposed approach: before calling `inviteUserByEmail()`, check for an
existing Auth account for that email. The currently-installed
`@supabase/auth-js` admin surface (confirmed by direct inspection this
session: `inviteUserByEmail`, `generateLink`, `createUser`, `listUsers`,
`getUserById`, `updateUserById`, `deleteUser`) has no dedicated
`getUserByEmail`. Two viable options, to be confirmed against the exact
installed SDK version at implementation time rather than assumed now:

1. `listUsers()` with client-side email filtering — works today for
   certain, but doesn't scale cleanly to a large user base without
   pagination handling.
2. A direct, read-only query against `auth.users` via the service-role
   client (Postgres-level, not GoTrue-API-level) — likely more efficient,
   needs confirming the app's Supabase client can address the `auth`
   schema (most of this app's admin queries currently target `public`
   only).

**New Auth user** → unchanged: create account + send invitation
(`createInvitation`, today's path). **Existing Auth user** → do not call
`inviteUserByEmail()` again; call `generateLink({type: 'recovery', ...})`
instead (the same fix already identified for the pre-existing Resend
defect in Phase 1's Validation Report, Finding 3 — this redesign and that
fix are the same underlying change, applied consistently everywhere an
invite can be sent) and still create the `invitations` row so it's
trackable through the same lifecycle.

### 3.5 Migrations needed

- `invitation_status` add `'archived'` (additive, standalone, same
  discipline as migration `016`).
- No schema change needed for Delete/Restore — both are status
  transitions plus the Auth-deletion-timing change in §3.2.

### 3.6 Audit history

Every transition above already has (or gets) a corresponding
`recordAuditEvent` call, consistent with the existing pattern
(`user.invited`, `invitation.resent`, `invitation.revoked`, plus new
`invitation.restored`, `invitation.deleted`, `invitation.archived`).
Deleting an invitation row does **not** delete its audit log entries —
`recordAuditEvent` writes to a separate `audit_events` table keyed by
`targetId`, not a foreign key requiring the target to still exist (to be
confirmed against the actual constraint at implementation time). This is
how "preserve complete audit history for every accepted user" is
satisfied even though Delete is only reachable pre-acceptance in the
first place — accepted users are never deletable through this flow at
all, so their audit trail is never at risk.

---

## 4. Item B — Coach Module Functional Specification: Team Roster Management vs. Match Squad Workflow

This is not scoped as a UI change — it's a workflow redesign. The roster
becomes the single source of truth every match-facing feature (lineups
today; substitutions, statistics, goals, and cards as those subsystems
grow) reads from, instead of each screen independently assuming player
data that has to come from somewhere else.

### 4.0 Major finding: the Visual Lineup Builder already exists — do not rebuild it

Before scoping "Formation" and "Visual Lineup Builder" as new work, this
session checked what the extensive Formation Engine work from earlier in
this project (`lib/formation-engine.ts`, `lib/tactical-formation.ts`,
`components/formation/FormationPitchEditor.tsx`) already provides,
grounded by reading the actual component code rather than assuming from
its name:

- **Drag & drop, live repositioning, tap-to-captain, and formation-switch
  auto-arrange are already built and working**, confirmed directly in
  `FormationPitchEditor.tsx`: pointer-based dragging (`onPointerDown`, a
  `draggingId`/`x,y` live-position state), a tap-vs-drag distinction (tap
  toggles captain, drag repositions), and its own in-code description —
  *"Switching formation keeps every player, only repositions them"* — is
  exactly the "auto-arrange based on selected formation" requirement.
  Manual adjustment after auto-placement already works the same way.
- **All the named formations you listed already exist**, and more:
  `FormationName` (`lib/types.ts`) is `"4-4-2" | "4-3-3" | "3-5-2" |
  "3-4-3" | "4-2-3-1" | "4-1-4-1" | "5-3-2" | "5-4-1" | "4-5-1" |
  "custom"` — every formation you named is already a supported template
  in `lib/formations.ts`, plus three more.
- **"The same tactical layout later used by Live Center, Broadcast
  Graphics, Match Reports, Team Preview, Lineup Presentation" is already
  the architecture, not a new requirement.** `saveFormationCore`
  (`lib/tactical-formation.ts`) is explicitly role-agnostic — it's the
  *same* function called by the Coach's `saveTeamFormation`
  (`app/team/[token]/actions.ts`) and by Admin/Broadcast's equivalent
  action (`app/live/[matchId]/formation/actions.ts`), writing to the same
  `tactical_formations`/`tactical_positions` tables Broadcast's Graphics
  Composer already reads from. One persistence layer, already consumed
  by every surface you named.
- **What's actually missing is not the visual builder — it's that it's a
  second, disconnected screen today, not a step in the submission
  flow.** Confirmed by reading both server actions: `submitLineup`
  (Lineup screen, dropdown-based Starting XI/Bench/Captain selection,
  `app/team/[token]/actions.ts`) and `saveTeamFormation` (Formation
  screen, visual pitch, same file) are two independent write paths,
  loosely coupled only by both checking the same `lineups.locked` flag.
  A coach can submit a complete, valid Lineup via dropdowns and never
  visit the Formation screen at all — formation selection is optional
  today, not a required step before Submit, which is exactly the
  disconnect your workflow diagram (Roster → Match Squad → Starting XI →
  Substitutes → Captain → Formation → Validation → Submit) is asking to
  fix.

**Conclusion for scoping**: Item B's Formation/Visual Builder component is
a **reuse-and-integrate** item, not a build-from-scratch item. The
engineering work is: (1) merge the two screens into one continuous flow
ending in a single Submit, with the existing `FormationPitchEditor`
becoming the Starting-XI-placement step instead of a separate optional
detour; (2) wire in the existing Broadcast Preview components (§4.6,
below) as the workflow's preview step.

**Correction to the previous draft of this spec, checked directly rather
than assumed**: the previous version of this document flagged "smooth
animated movement between formations" as an open question, framed as
something that might need to be newly built as polish. That was
incomplete — checked precisely this round:

- The coach's **editable** pitch (`PlayerToken.tsx`, the component
  `FormationPitchEditor` drags) positions players via a plain inline
  `style={{ left, top }}` with **no CSS transition on position** — moving
  a token or switching formations there is an instant jump today, not an
  animation. This is actually the correct behavior for an active drag
  surface (an eased transition while a coach is dragging would feel
  laggy, not smooth), so nothing here needs to change.
- **The smooth, eased animation you're describing already exists — as its
  own dedicated, already-built component**:
  `components/live/formation/FormationAnimationPreview.tsx`, which
  animates each player's `left`/`top`/`transform`/`opacity` with a real
  `cubic-bezier(0.16,1,0.3,1)` easing curve and a per-player stagger
  delay — built specifically as a **read-only presentation** of a
  formation, separate from the editable surface, from the earlier
  Broadcast Operations Center work.
- There's also `components/formation/BothTeamsPitchView.tsx` — a
  presentation-only "both teams on one pitch" graphic, whose own code
  comment already states it's built to be reused "from the Graphics
  Engine, Live Center, Match Reports, or a future PNG/social export,"
  built entirely on the same shared `PitchMarkings`/`PlayerToken`
  rendering primitives, no duplicated pitch or token logic.

**Net correction**: nothing about the existing animation needs to be
"preserved" by avoiding a change — it isn't in the editor to begin with,
and doesn't need to be. What Phase 2 needs to do is **reuse the
already-built `FormationAnimationPreview`/`BothTeamsPitchView`
presentation layer** as the Match Lineup workflow's Broadcast Preview
step (§4.6), instead of assuming either that animation needs to be built
from scratch, or that it needs to be added to the live drag surface where
it would actually hurt the editing experience.

### 4.1 Grounded findings

- The data model **already separates these two concepts** — `players` is
  a per-team roster table; `lineups` is a per-match table that references
  players by id. No schema conflation exists.
- **Reuse confirmed, not just for lineups.** Checked beyond `lineups`:
  `match_events` (goals, cards, substitutions — `supabase/schema.sql`)
  already stores `player_id uuid references players(id)`, not a free-text
  name. So "every lineup, substitution, statistic, goal, and card should
  reference these existing player records instead of manually typed
  names" is **already true at the schema level for everything that
  exists today** — no new entities, and no migration needed to fix
  free-text player references, because there aren't any. This
  significantly narrows Item B to exactly what you asked for it to be
  narrowed to: missing coach-facing CRUD, permissions, and UI — not a
  data-model rebuild.
- The conflation is entirely in the **UI and in sequencing**: there is
  currently no coach-facing roster CRUD at all
  (`addPlayer`/`updatePlayer`/`deletePlayer` exist only in
  `app/admin/teams/[id]/actions.ts`, admin-only), and nothing gates the
  Match Lineup screen on a roster existing first.
  `app/team/[token]/LineupForm.tsx`'s dropdowns render against whatever
  `players` array the server passes in — if that array is empty (a
  brand-new team with no admin-entered roster yet), the form still
  renders, with every "— Chwazi jwè —" dropdown simply having no options.
  Nothing today stops a first-time coach from landing directly on an
  unusable Lineup screen, which is exactly the gap you observed live.
- The `players` table currently has only `number` and `full_name`
  (`lib/types.ts`'s `Player`) — no `position`, no photo, no preferred
  foot, no captain flag. Building real roster management means extending
  this table, not just exposing new UI over existing columns.
- Coach Portal nav (`components/coach/BottomNav.tsx`) has one entry, "Lis
  Ekip" (`/team/{token}/lineup`), that today does match-lineup submission
  only — there's no second nav entry it could be confused with yet,
  because roster management doesn't exist as a coach-facing screen at
  all.
- **Confirmed by checking `supabase/schema.sql` directly: rosters are
  already season-independent, with no new architecture needed for
  "future seasons: reuse existing players."** `players.team_id` references
  `teams`; `teams.competition_id` references `competitions` directly —
  neither `teams` nor `players` nor `matches` has any `season_id` column
  anywhere. `seasons` exists only as a competition-level registration-window
  record (`registration_start/end`, `season_start/end`), not as something
  a team or its roster is scoped into. Since a team row is the same row
  across however many seasons its competition runs, its `players` roster
  is automatically permanent and automatically available every season —
  "reuse existing players / add new / deactivate old across seasons" is
  already the natural behavior of the existing schema, not a capability
  that needs to be built. Nothing here changes this item's migration
  plan (§4.5).
- **Confirmed, per your explicit clarification: the Team Roster is
  Coach-owned; Admin retains technical access but the normal operational
  workflow never depends on Admin entering players.** Today's admin-side
  `addPlayer`/`updatePlayer`/`deletePlayer`
  (`app/admin/teams/[id]/actions.ts`) is kept — not removed — scoped
  explicitly to emergency support, corrections, bulk imports, and
  competition administration, not as a parallel normal-path way to build
  a roster. The coach-facing Roster module (§4.3) is the canonical path;
  Admin's player CRUD becomes support tooling, not a first-class
  workflow. No code change is implied by this alone — it's a
  clarification of intent that shapes how the coach Roster module is
  positioned (primary) versus admin's existing player CRUD
  (support/fallback), both already calling into the same underlying
  `players` table with no duplication either way.
- **Canonical workflow, confirmed and unchanged from your spec**:
  Competition → Team → Assign Coach (the invitation acceptance flow,
  §3) → Coach builds Team Roster → Roster unlocks Match Squad → Starting
  XI → Bench → Formation Builder → Broadcast Preview → Validation →
  Submit. This matches §4.2's workflow diagram exactly — restated here as
  the single, non-competing canonical path for the Coach experience.
- **Single player identity, confirmed already true structurally** — every
  reference to a player throughout the platform (`lineups.starting_xi`,
  `lineups.substitutes`, `lineups.captain_id`, `match_events.player_id`)
  is a foreign key to the same `players.id`, never a duplicated or
  free-text record. There is already exactly one player identity used
  everywhere; nothing needs to change here for this requirement to hold.
- **Future player transfers are already supported by the current schema
  without a redesign — confirmed by checking the actual foreign keys, not
  assumed.** A transfer would mean changing `players.team_id` to a new
  team. Checking whether that would corrupt historical Match Events,
  Goals, Cards, or Lineups: it would not — `match_events.team_id` and
  `lineups.team_id` are their own independently-stored columns, not
  derived from the player's *current* `team_id` at read time. A past
  match's events and lineup already record which team the action was for
  at the time it happened, regardless of which team the player belongs to
  today. So a future transfer feature only needs a new action to update
  `players.team_id` (and decide whether jersey number is re-assigned,
  since `unique(team_id, number)` is scoped per-team already, not
  platform-wide) — it does not need any schema redesign, and this item
  does not need to build anything for it now, per your instruction.

### 4.2 First-login / onboarding flow (gated), and the full Match Squad workflow

```
Coach logs in
      ↓
Does this team's roster have players yet?
      ↓                              ↓
     No                             Yes
      ↓                              ↓
Land on My Team Roster        Match Squad available normally
"Build your roster to get
started" — Add Player forms,
no Match Squad access yet
      ↓
Add players, Save
      ↓
Roster now exists →
Match Squad unlocked
```

Match Squad's job narrows to exactly what you specified — a single
continuous flow, not two disconnected screens (§4.0):

```
Choose Match (which scheduled fixture this lineup is for)
      ↓
Select Match Squad  (from roster — see §4.2a for squad-size limit)
      ↓
Starting XI  (from the selected Match Squad)
      ↓
Bench        (from the selected Match Squad — see §4.2a for bench limit)
      ↓
Captain      (defaults from roster's Captain Flag, §4.3, override allowed)
      ↓
Formation    (existing FormationPitchEditor, §4.0 — becomes a required
              step here instead of an optional separate screen)
      ↓
Formation Pitch  (place/adjust the Starting XI — same step as above,
                  named separately per your workflow to distinguish
                  "pick a formation shape" from "arrange players on it")
      ↓
Broadcast Preview  (§4.6 — reuses existing read-only presentation
                    components, not a new build)
      ↓
Validation   (§4.3a)
      ↓
Submit
```

Note on "Select Match Squad": your spec introduces this as a distinct
step from Starting XI/Bench — i.e. first narrow the full roster (e.g. 28
players) down to the matchday squad (e.g. 20), *then* split that squad
into Starting XI (11) and Bench (9). This is a real, distinct UI step
beyond what the previous draft of this spec scoped (which went straight
from roster to Starting XI/Bench) — captured here and in §4.2a's
`squad_size` rule below.

The Match Squad screen **never creates players** — every selection
control reads from the roster only, matching your explicit constraint.

Proposed roster-gate condition (open question for approval, not decided
here): block on **zero players** (the unusable-immediately case you hit),
or block on **fewer than 11** (the minimum for a valid Starting XI)?
Recommend the stricter "fewer than 11" gate with a progress indicator
("7 of 11 minimum players added"), since a roster of 3 players is just as
unable to produce a valid lineup as a roster of 0 — but this is a real
product decision, not an implementation detail, and should be confirmed
before building. Per your instruction, this gate applies **only** to
Match Squad — the Team Roster itself must never be blocked, at any
roster size, including zero.

This gate is enforced the same way `requireCoach` already enforces every
other access rule for this portal — a server-side check, not merely
hiding the nav item, since the nav item hiding alone wouldn't stop direct
navigation to `/team/{token}/lineup`.

### 4.2a Competition-configured squad rules (Starting XI fixed, bench configurable)

Grounded finding: bench size is **currently hardcoded to 9**, in two
separate places that would need to agree with each other today —
`LineupForm.tsx`'s `const SUB_SLOTS = 9` (the UI) and
`app/team/[token]/actions.ts`'s `submitLineup`
(`Array.from({ length: 9 }, ...)`, the server-side truth). The
`competitions` table (`supabase/schema.sql`) has no squad-size or
substitute-count column today — `match_duration`, `halftime_duration`,
`extra_time_enabled`, `penalties_enabled`, and the points/status columns
exist, but nothing about squad composition. This is a real gap, not an
oversight in reading the schema wrong.

Proposed fix, now confirmed as **three independent, per-competition
rules**, matching your Roster 28 / Match Squad 20 / Starting XI 11 /
Bench 9 / Maximum Substitutions 5 example exactly:

- **Starting XI stays fixed at 11** everywhere — this is a law of football,
  not a per-competition setting, and the existing `validateFormation`
  (exactly 11, exactly 1 GK) and `submitLineup` (`starting_xi.length !==
  11`) checks already correctly hardcode this. No change needed here.
- **`competitions` gains three new additive columns**, each independent,
  each defaulting to a value that reproduces today's actual behavior so
  no existing competition changes silently:
  - `match_squad_size int` (nullable — see below) — caps how many roster
    players a coach may select into a given match's squad before
    splitting them into Starting XI/Bench (the new "Select Match Squad"
    step, §4.2).
  - `max_bench int not null default 9` — replaces the hardcoded `9` in
    both `LineupForm.tsx`'s `SUB_SLOTS` and `submitLineup`'s
    `Array.from({ length: 9 }, ...)`. Both currently only *imply* a limit
    by how many `<Select>` rows render — `submitLineup` has no explicit
    maximum check today, so this also needs a real server-side
    `substitutes.length > max_bench` rejection, not just a UI change.
  - `max_substitutions int` (nullable) — **a different enforcement point
    than the other two.** `match_squad_size` and `max_bench` gate what a
    coach may *submit* in the Lineup (`submitLineup`); "Maximum
    Substitutions" (e.g. 5) governs how many actual in-game substitution
    events are allowed *during* the match — that's enforced against
    `match_events` (type `substitution`) at Live Center / match-tracking
    time, a separate subsystem from the coach's pre-match Lineup
    submission. Scoping it here as a competition-level column now (so
    Operations Overview/Live Center work in §9 can read it later) but its
    actual enforcement point is out of this item's UI, not inside the
    Match Squad workflow.
- `match_squad_size` is proposed nullable (no cap) rather than defaulting
  to a specific number, since — unlike bench size, which this app already
  hardcodes something for — there's no existing behavior to preserve a
  default for; a competition that doesn't set one simply allows the full
  roster as the eligible match squad, same as today's effective behavior
  (no squad-size concept exists at all right now).

### 4.3 Team Roster module — coach-facing CRUD

- **Add Player** — jersey number, full name, position (open: free text
  vs. a fixed position enum — recommend a fixed set, e.g.
  Goalkeeper/Defender/Midfielder/Forward, for consistent future
  filtering/stats, finalized alongside Multi-Language string work),
  optional photo, optional preferred foot (Left/Right/Both), optional
  captain flag.
- **Edit Player** — same fields, editable any time.
- **Remove Player / Active-Inactive** — your spec names this explicitly
  as an Active/Inactive flag rather than a delete, which resolves the
  open question the previous draft of this spec raised: a player who has
  already been part of a submitted lineup or a recorded match event
  should not simply disappear from historical records (a past match's
  lineup/scoresheet referencing a deleted player would break, not just
  look odd — `match_events.player_id` is `on delete set null`, which
  would silently blank out historical goal/card attribution). Proposed
  behavior: "Remove Player" sets `active = false` — the player leaves
  every future roster-selection dropdown (Match Squad, Formation) but
  every past record referencing their `player_id` stays intact and
  correctly attributed. A true hard delete, if wanted at all, would only
  ever be safe for a player with zero match history — same reasoning
  already established for invitation Delete eligibility (§3.1) — and is
  not part of this spec unless you want it added.
- **Bulk roster creation** — CSV import, Excel import, and structured
  copy/paste, as specified. No existing groundwork for this in the
  codebase (checked: no import/parsing utilities for tabular player data
  exist today). Proposed shared core: one parser that normalizes all
  three input shapes (a pasted tab/comma-separated block is structurally
  the same problem as a CSV row) into the same `{number, full_name,
  position?, preferred_foot?}` shape, then reuses the same validation
  the single-player Add Player action already needs (unique jersey number
  per team, non-empty name) — one shared row-validation function, not
  three separate import paths. Row-level errors (duplicate jersey number,
  missing required field) should be reported per-row so a coach can fix
  and re-import just the bad rows, not have the whole import rejected for
  one mistake — an open UX decision to confirm before building, not
  assumed here.
- **Captain Flag** — this is a **roster-level default**, distinct from
  `lineups.captain_id`, which is already a **per-match** field today
  (a coach can already name a different captain for a specific match).
  Proposed behavior: the roster's captain flag pre-selects that player as
  captain when a coach opens a new Match Lineup, but the coach can still
  override it per match via the existing `lineups.captain_id` field — not
  a replacement for match-level captain selection, a sensible default for
  it. Confirm this interpretation before implementation, since "Captain
  Flag" could otherwise be read as wanting a single fixed captain with no
  per-match override, which would be a behavior change from today.

### 4.3b Player Status (availability foundation)

New field, informational only at this stage — **does not gate
selection**, per your instruction.

- **Proposed values**: `available | doubtful | injured | suspended` — a
  new Postgres enum (`player_availability_status`, same pattern as this
  schema's existing `access_status`/`invitation_status`/`lineup_status`
  enums), defaulting every player to `available` so no existing roster
  needs backfilling.
- **Confirmed: "Inactive" is not a fifth value in this enum.** It's
  covered by the `active` boolean from §4.3 and is *derived* from
  `active = false` wherever it needs to be displayed alongside
  Available/Doubtful/Injured/Suspended — never stored a second time.
- **Display, not enforcement**: during Match Squad/Starting XI/Bench
  selection (§4.2), each player's row shows a small status badge/warning
  next to their name (e.g. an amber marker for Doubtful, a red marker for
  Injured/Suspended) — reusing this portal's existing badge/chip pattern
  (`components/coach/BottomNav.tsx`'s active-tab chip styling, the
  Captain/GK chips already in `LineupForm.tsx`'s `Chip` component) rather
  than introducing a new visual language. A coach can still select a
  Doubtful/Injured/Suspended player into the Starting XI or Bench — the
  spec is explicit that this must warn, not block.
- **Confirmed: ownership is role-based.** Coach (via Edit Player, §4.3)
  may set `available`/`doubtful`/`injured` — normal, self-reported team
  information. `suspended` is admin/competition-manager-only — a
  competition-imposed disciplinary fact, not coach-editable, preserving
  competition integrity. Implementation implication: this needs two
  separate permission checks, not one shared "update player" action —
  the coach-facing Edit Player action (§4.5) must reject a `suspended`
  value server-side (not just hide it in the UI), and a corresponding
  admin-side action is needed to set/clear `suspended` specifically,
  likely alongside `app/admin/teams/[id]/actions.ts`'s existing player
  actions rather than as a new file.
- **Scope boundary, per your "foundation" framing**: this ships as a flat
  status + visual warning only. It does not include expected-return
  dates, suspension match-counts/appeals, or availability calendars —
  those remain deferred (§4.7 updated below).

### 4.3a Validation before Submit

Grounded finding: two of your four required checks are **already
enforced today**, just not together in one place — `submitLineup`
already rejects anything other than exactly 11 starters and rejects a
captain who isn't one of the 11 (`app/team/[token]/actions.ts`);
`validateFormation` (`lib/formation-engine.ts`) already enforces exactly
11 placed players, exactly one goalkeeper, exactly one captain, no
duplicates, and a fully-filled valid formation layout — but only when a
coach actually visits the (currently separate) Formation screen, per
§4.0. Once Formation becomes a required step in one merged flow rather
than an optional detour, these checks become naturally unified instead of
needing to be rebuilt:

| Requirement | Status |
|---|---|
| Exactly 11 starters | Already enforced (`submitLineup`) — carries over unchanged |
| Captain selected | Already enforced (`submitLineup` + `validateFormation`) — carries over unchanged |
| Formation selected | Not currently required before Submit (Formation is optional today) — becomes required once merged, per §4.0 |
| Competition rules satisfied (`match_squad_size`, `max_bench`) | Not enforced anywhere today (§4.2a) — new server-side check needed once these are real competition columns. (`max_substitutions` is not a Submit-time check — see §4.2a) |

Error messaging should follow the existing pattern already used
throughout this portal (`ERRORS` maps + inline messages in
`LineupForm.tsx`/`ResetPasswordPage`) — specific, per-field where
possible ("You have 9 starters selected — 11 are required" rather than a
generic "invalid lineup"), consistent with how the rest of this app
already writes error copy.

### 4.4 Navigation

Recommend a genuine second module rather than a tab-within-a-tab: add a
"Roster" (or "Ekip" — naming TBD alongside the Multi-Language work) entry
to `BottomNav.tsx` alongside the existing "Lis Ekip" (relabeled to
something unambiguous about being the Match Squad flow, e.g. "Match
Squad"/"Lis Match" — exact Kreyòl/French/English strings to be finalized
together with the Multi-Language Foundation work in §6 rather than
decided ad hoc here). Two clear entry points matches how the underlying
data is already modeled and avoids overloading one nav item with two
different jobs.

**Consequence of §4.0/§4.3a for the existing nav**: `BottomNav.tsx`
currently has a *third*, separate "Fòmasyon" tab pointing at the standalone
Formation screen. Once Formation becomes a required step inside the
merged Match Squad flow rather than an optional side screen, that
standalone nav entry becomes redundant for the coach's own live-match
workflow and should be removed from `BottomNav.tsx` — the same
`FormationPitchEditor`/`saveTeamFormation` it pointed to doesn't go away,
it just gets reached as a step of Match Squad instead of as its own tab.
Net result: still two coach-facing nav entries for this area (Roster,
Match Squad), not three — flagging this explicitly since removing an
existing nav item is a real behavior change worth confirming, not an
implementation detail to decide silently.

### 4.5 New surface needed

- `lib/types.ts`'s `Player` gains `position: string | null`,
  `photo_url: string | null`, `preferred_foot: string | null`,
  `is_captain: boolean` (default `false`), `active: boolean`
  (default `true`) per §4.3's Active/Inactive rule, and
  `availability_status: "available" | "doubtful" | "injured" |
  "suspended"` (new `player_availability_status` enum, default
  `'available'`) per §4.3b — migration, additive only, same discipline as
  every prior Phase 1 migration.
- `competitions` gains three additive columns per §4.2a:
  `match_squad_size int` (nullable, no cap by default), `max_bench int
  not null default 9` (preserves today's hardcoded behavior), and
  `max_substitutions int` (nullable — enforced elsewhere, at in-game
  substitution-tracking time, not at Lineup Submit).
- New coach-facing server actions (`addPlayer`/`updatePlayer`/
  set-active equivalents, scoped to the coach's own team via
  `requireCoach`, mirroring the existing admin versions' shape) — this is
  a real permission-surface change (coaches gain player CRUD they don't
  have today) worth flagging explicitly for approval, not an
  implementation detail. Admin's existing player CRUD in
  `app/admin/teams/[id]/actions.ts` stays as-is; both surfaces would call
  into the same underlying persistence rather than duplicating logic,
  following the same shared-core pattern Phase 1 established for
  invitations (`lib/invitation-service.ts`).
- A new bulk-import action (CSV/Excel/paste, §4.3) with shared row
  validation, reusing the same uniqueness/required-field rules as
  single-player Add Player.
- The new server-side roster-gate check for Match Squad access (§4.2).
- **Merging `submitLineup` and `saveTeamFormation` into one flow**
  (§4.0/§4.3a) — the bigger structural change in this item. Both already
  write to data keyed by the same `(match_id, team_id)` pair and already
  share the same `locked` gate; the work is sequencing Formation as a
  required step before the existing Submit action fires, and adding the
  new competition-rules check (§4.2a) alongside the validation
  `submitLineup` already performs — not building new persistence, since
  both tables and both server functions already exist and already work.
- Player photo upload reuses the existing Asset Platform
  (`ASSET_CATEGORIES` — a new `PlayerPhoto` category, entity-id
  namespaced by player id, following the same pattern Phase 1 established
  for `CoachPhoto`). Photos stay optional, per spec — when absent, reuse
  this app's existing no-photo fallback pattern rather than inventing a
  new one: the coach layout header already falls back to a two-letter
  initials badge when `team.logo_url` is null
  (`app/team/[token]/(coach)/layout.tsx`); the same pattern applies to a
  player with no photo (initials from `full_name`, themed the same way).

### 4.6 Broadcast Preview

Per §4.0's correction: this step **reuses existing, already-built
read-only presentation components** —
`components/live/formation/FormationAnimationPreview.tsx` (the real
eased, staggered formation-to-formation animation) and/or
`components/formation/BothTeamsPitchView.tsx` (presentation-only, both
teams on one pitch, already documented in its own code as intended for
reuse by "the Graphics Engine, Live Center, Match Reports, or a future
PNG/social export"). Both already consume the same `PlacedPlayer`/
`PitchMarkings`/`PlayerToken` primitives the editable `FormationPitchEditor`
uses, so a lineup arranged in the workflow's Formation Pitch step (§4.2)
maps directly onto either preview with no data transform beyond what
`buildInitialPositions` (`lib/formation-engine.ts`) already does.

Scope for this step: after the coach finishes arranging the Starting XI,
show one of these existing components in read-only "this is what will be
broadcast" mode before Validation/Submit — genuinely a wiring task
(passing the same `saved`/`positions` data these components already
accept), not new rendering work. Open question for approval: single-team
preview (`FormationAnimationPreview`) or both-teams-on-one-pitch
(`BothTeamsPitchView`, which needs the opponent's formation data too —
only available if the opponent's coach has already submitted theirs)?
Recommend single-team for the coach's own preview, since the opponent's
lineup may not exist yet at the time a coach is building their own.

### 4.7 Future improvements — explicitly deferred, not scoped into this item

Per your instruction, documented for a future sprint and **not designed
or implemented as part of this item**:

- Copy Previous Match Lineup (pre-fill a new Lineup from the team's most
  recent submitted one)
- Duplicate Last Formation
- Save Draft (persist an in-progress, unsubmitted Lineup/Formation)
- Per-match Player Availability (distinct from the flat, always-current
  `availability_status` in §4.3b — e.g. "doubtful for *this specific*
  match" vs. the roster-wide status field that now ships)
- Injury detail (expected return date, injury type/notes — §4.3b ships
  only the flat `injured` status, not case detail)
- Suspension detail (match-count tracking, appeals, automatic
  expiry — §4.3b ships only the flat `suspended` status, set manually)
- Tactical Notes

**Updated by this refinement**: a flat, foundation-level version of
Player Status now ships as part of this item (§4.3b) — Available /
Doubtful / Injured / Suspended as a single always-current field with a
visual, non-blocking warning at selection time. What's deferred above is
specifically the *deeper* per-type management (dates, counts, history,
per-match overrides) layered on top of that foundation — not the concept
of availability itself, which §4.3b already covers.

These all plausibly extend the same `players`/`lineups` data model this
item establishes (e.g. per-match Availability/Injury/Suspension detail
likely want their own time-bound state on `players`, not new entities)
but none of them are scoped, migrated, or estimated here — listed only so
they aren't lost, and so this item's schema choices don't accidentally
foreclose them later.

---

## 5. Coach Support / Help & Support

Proposed location: **Profile → Help & Support**, as suggested — the
Coach Portal's Profile tab already exists and already ends in a single
action (logout), so a Help & Support section fits naturally above or
below it without a new nav entry.

Recommended scope for a first version, distinguishing what needs new
backend work from what doesn't:

- **WhatsApp / Email / Contact League Administrator** — no new backend
  needed; these are static `wa.me`/`mailto:` links, plus "Contact League
  Administrator" resolving to whichever admin/competition_manager is
  associated with the coach's competition (or a single platform-wide
  support contact, if per-competition routing isn't wanted — open
  question for approval).
- **FAQ** — static content, no new backend needed; likely a simple
  in-portal page.
- **Report Problem** — the one item that's a real scope decision, not a
  static link: does this need a persisted, admin-visible queue (a new
  table, an admin inbox), or is routing it through the same
  WhatsApp/email contact sufficient for a first version? Recommend
  starting with the latter (no new backend) and treating a real
  ticketing/inbox system as its own future item if volume ever justifies
  it — flagged here rather than scoped in, since building a ticketing
  system is a materially bigger commitment than the rest of this item.

---

## 6. Item D — Multi-Language Foundation (restated, unchanged in scope)

Kreyòl Ayisyen / English / Français, platform-wide. Language selection
available to every authenticated user, remembered across sessions. No
new findings from live validation beyond the sequencing note in §2 (build
Items A and B with translation keys from the start rather than retrofit).
Full design still to be presented as its own approval step per the
existing standing instruction — this plan only re-confirms it's in scope
and where it sits in the order.

---

## 7. Item E — Interzone 2026 Import Specification (restated, unchanged)

Design-only pass — data model / mapping specification for the real
Interzone 2026 competition dataset, no data written. Unchanged from the
original request; still gated on its own review before Item F begins.

## 8. Item F — Interzone 2026 Dataset Import (restated, unchanged)

Depends on Item E's specification being approved first.

## 9. Item G — Operations Overview (restated, unchanged)

Cross-competition operational rollup, real audit-log browsing UI, bulk
admin actions. Depends on Item A's redesigned invitation states and
Phase 1's `archived`/`expired` states being correct before they're
surfaced platform-wide.

## 10. Item H — Broadcast Experience (restated, unchanged)

Navigation hardening, larger team logos, centered match clock,
production-queue/statistics-overlay polish. Lowest urgency signal from
this round's live validation; unchanged from the original outline.

---

## 11. Explicit non-implementation notice

No code, migration, or configuration change has been made as a result of
this document. Every item above — including the two newly-surfaced ones
(A and B) — requires its own explicit approval before implementation
begins, consistent with how Force Password Reset's redesign was handled
in Phase 1: a reviewed proposal is not the same as an approved one.
