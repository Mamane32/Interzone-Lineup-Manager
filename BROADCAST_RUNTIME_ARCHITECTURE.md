# Broadcast Runtime Architecture

**Status:** Sections 1–8 (the original eight responsibilities — Session
lifecycle, Active Operator, Active Provider, Provider Capabilities,
Health & Synchronization, Event Bus, Graphics Renderer, Outputs) are
**approved**. Sections 9–13 below extend that model with Profiles,
capability-based Source of Truth, the Match/Broadcast Event split,
Diagnostics, and a Platform Scope recommendation — **proposal, pending
approval**.

This document, in both this revision and the prior one, ships **zero
source-file changes**. No migration, no new `lib/` file, no UI. It exists
to be reviewed before Phase 2 (the first real provider, vMix) is built.

## Why a Runtime layer, given `lib/broadcast/` already exists

`BROADCAST_BRIDGE_ARCHITECTURE.md` established the Engine/Operator split:
GGSP is always the Engine (source of truth), and exactly one system — GGSP
itself, vMix, or (later) OBS — is the Operator for a given match. That's
still the correct model. What it didn't yet specify is *how the pieces that
already exist compose into one coherent runtime* as more providers arrive.

Today, "the broadcast layer" is really four separate, unconnected registries,
each with its own shape:

| Concern | Lives in | Registry |
|---|---|---|
| Outbound commands (GGSP → production system) | `BroadcastEngine.ts` | `REGISTERED_SYSTEMS: BroadcastSystemEngine[]` |
| Inbound events (production system → GGSP) | `BroadcastBridge.ts` | `REGISTERED_BRIDGE_PROVIDERS: BroadcastBridgeProvider[]` |
| Subsystem status display | `BroadcastSession.ts` | a hand-written array, not a registry |
| Graphics take/hide | `ProductionQueueEngine.ts` | `REGISTERED_CONSUMERS: ProductionQueueConsumerHandler[]` |

A `vmix` provider today would need an entry in `BroadcastEngine`
(`VMixEngine`, already exists), a *separate* entry in `BroadcastBridge`
(doesn't exist yet), a hand-edit of `BroadcastSession.ts`'s subsystem array,
and its own ad hoc capability checks scattered through UI components. The
Runtime is the fifth piece that owns all four registries as one coherent
object per match, so a provider is written once, against one interface, and
automatically gets outbound dispatch, inbound events, status display, and
capability-gated UI for free.

## 1. Broadcast Session lifecycle

A **session** is "GGSP is actively producing this match" — distinct from
`matches.live_status` (the match clock's own state machine). Derived state,
not new persistence: `idle` before any operator has touched the match,
`active` once an operator is selected and the match enters live production,
`ended` once the report is finalized. No schema change.

## 2. Active Operator

Already real: `matches.broadcast_operator` (migration 035),
`setBroadcastOperator()`, `BroadcastOperatorControl.tsx`. Section 10 below
reinterprets what this value *means* once ownership becomes
capability-based, but the field, the action, and the UI stay exactly as
they are — no schema or behavior change.

## 3. Active Provider

**New concept.** `BroadcastProvider` is one interface unifying what
`BroadcastSystemEngine` (outbound) and `BroadcastBridgeProvider` (inbound)
each cover today, plus capabilities and health:

```ts
interface BroadcastProvider {
  readonly id: BroadcastOperator;       // "ggsp" | "vmix" | "obs" | future ids
  readonly label: string;
  readonly capabilities: ProviderCapabilities;  // section 10

  getHealth(): Promise<ProviderHealth>;

  dispatch(command: BroadcastCommand): Promise<BroadcastCommandResult>;

  onProviderEvent?(handler: (event: MatchEvent) => Promise<void>): void;
}
```

Every provider — including `ggsp` itself — is a registered instance.
Standalone Mode stops being "the absence of a provider" and becomes "the
`ggsp` provider is active," which is what makes capability-gating and the
Graphics Renderer split uniform instead of special-cased.

## 4. Health & Synchronization

```ts
interface ProviderHealth {
  providerId: string;
  state: "not_configured" | "connected" | "degraded" | "error";
  detail?: string;
  lastEventAt?: string;
  latencyMs?: number;      // new in this revision — see Diagnostics, section 12
  checkedAt: string;
}
```

`degraded` means "connected, but stale" — e.g. a provider answers status
pings but hasn't sent an inbound event in longer than expected during an
active session. **Synchronization** compares what GGSP's database believes
against what the active provider is actually showing — informational only,
never blocking a write. Only meaningful for a provider whose `match_events`
capability (section 10) it currently owns.

## 5. Event Bus

Publishes events instead of hardcoding sequential subscriber calls inside
Server Actions. This revision splits what was one `RuntimeEvent` type into
two families — see section 11.

## 6. Graphics Renderer abstraction

```ts
interface GraphicsRenderer {
  readonly providerId: BroadcastOperator;
  isActive(operator: BroadcastOperator): boolean;
}
```

Names the existing GGSP-vs-handoff split (`OperatorHandoffNotice`) as an
interface instead of an inline `if` per output page.

## 7. Outputs

```ts
interface BroadcastOutput {
  readonly id: string;      // "program" | "preview" | future: "scoreboard-only"
  readonly path: string;
}
```

A registry, same pattern as everywhere else in this layer. Today: `program`
and `preview`, both GGSP-only.

## 8. `BroadcastRuntime` façade

```ts
interface BroadcastRuntime {
  getSession(matchId: string): Promise<BroadcastSession>;
  getActiveProvider(matchId: string): Promise<BroadcastProvider>;
  getOwner(matchId: string, capability: BroadcastCapabilityKey): Promise<BroadcastOperator>; // new — section 10
  dispatch(matchId: string, command: BroadcastCommand): Promise<BroadcastCommandResult[]>;
  publish(event: MatchEvent | BroadcastEvent): Promise<void>;  // revised — section 11
  getRenderer(matchId: string): Promise<GraphicsRenderer>;
  getDiagnostics(matchId: string): Promise<RuntimeDiagnostics>; // new — section 12
  outputs: BroadcastOutput[];
}
```

---

## 9. Broadcast Profiles

**New concept.** A profile is a named, reusable production configuration —
so an operator picks "Television Production" once instead of manually
assigning ownership for eight capabilities before every event.

```ts
interface BroadcastProfile {
  id: string;                 // "interzone_production" | "friendly_match" | "television_production" | "studio_production"
  label: string;
  description?: string;
  defaultOperator: BroadcastOperator;
  capabilityOwnership: Partial<Record<BroadcastCapabilityKey, BroadcastOperator>>;
  enabledOutputs: string[];         // subset of REGISTERED_OUTPUTS ids
  requiredProviders: BroadcastOperator[]; // providers this profile expects connected; informational, not enforced
}
```

`capabilityOwnership` can only override capabilities that aren't
Engine-fixed (section 10) — `website` and `statistics` are never
assignable, in any profile, by construction, not convention. A profile
that tried to override one would be invalid, the same way a match can't
have two `live` production_queue items for one consumer today.

The four requested profiles, concretely:

| Profile | `defaultOperator` | `capabilityOwnership` overrides |
|---|---|---|
| **Interzone Production** | `ggsp` | none — today's only real behavior, given a name |
| **Friendly Match** | `ggsp` | none; differs from Interzone Production only in `enabledOutputs` (no program/preview needed for an informal match) |
| **Television Production** | `vmix` | `clock`, `graphics`, `replay`, `recording`, `audio`, `camera`, `streaming` → `vmix` (exactly the user's example) |
| **Studio Production** | `obs` (reserved — see note below) | `audio`, `graphics`, `recording` → `obs` |

`Studio Production` referencing `obs` is legal to *define* today the same
way `matches.broadcast_operator` already allows the value `obs` — reserved
in the schema, not selectable in the UI (`BroadcastOperatorControl.tsx`'s
existing "Soon" badge) until a real OBS provider is registered. Defining
the profile now costs nothing and means no later migration is needed to
add it.

Profiles are a hardcoded registry (`REGISTERED_PROFILES: BroadcastProfile[]`),
the same pattern as `REGISTERED_SYSTEMS`/`REGISTERED_OUTPUTS` — not a
database table. An admin-editable profile builder is a plausible later
step, but nothing today needs more than these four named presets; adding a
DB-backed builder ahead of a real request for custom profiles would be
speculative generality.

Applying a profile to a match means calling `setBroadcastOperator` and
persisting the profile's `capabilityOwnership` as that match's override
map — this is Phase 1.5 wiring, including one additive migration
(`matches.broadcast_profile`, nullable, defaulting to `null` = "no profile
applied, capability ownership is 1:1 with `broadcast_operator`" — the
current behavior, unchanged). Not built this pass.

## 10. Source of Truth — capability-based ownership

Today, `matches.broadcast_operator` is one value that implicitly means
"this system owns everything." The user's real production scenarios don't
work that way — Television Production hands vMix the clock, graphics,
replay, and recording, while GGSP still, always, owns the website and
statistics. Ownership needs to be **per capability**, not one flag for the
whole match.

```ts
type BroadcastCapabilityKey =
  | "clock"
  | "match_events"       // who originates event notifications — see the callout below
  | "graphics"
  | "replay"
  | "recording"
  | "streaming"
  | "audio"
  | "camera"
  | "commentary"
  | "animation"
  | "tactical_formation"
  | "website"            // Engine-fixed
  | "statistics";        // Engine-fixed

const ENGINE_FIXED_CAPABILITIES: BroadcastCapabilityKey[] = ["website", "statistics"];
```

`ProviderCapabilities` (introduced in section 3's original pass as several
separately-named booleans) becomes capability-key-driven instead, so a new
capability is a new entry in one list, not a new field on every provider:

```ts
interface ProviderCapabilities {
  canOwn: BroadcastCapabilityKey[];            // capabilities this provider is able to be the source of truth for
  canReceiveCommands: BroadcastCapabilityKey[]; // capabilities this provider accepts outbound dispatch() for (e.g. GGSP can receive "clock" updates for display even when it doesn't own the clock)
}
```

`ggsp` today: `canOwn: ["website", "statistics", "match_events", "graphics", "tactical_formation", "clock"]`,
`canReceiveCommands: ["graphics", "clock"]`. `vmix` today: `canOwn: ["graphics", "clock"]`
(honestly — no real recording/replay/audio/camera control exists yet, so
those aren't claimed), `canReceiveCommands: ["graphics", "clock"]`.

**Resolving an owner** for a given match + capability, in order:

1. If the capability is in `ENGINE_FIXED_CAPABILITIES` → always `"ggsp"`,
   full stop — no profile, override, or operator value can change this.
2. Else if the match's applied profile defines an override for that key →
   use it.
3. Else → fall back to `matches.broadcast_operator` (today's field,
   reinterpreted as **the default owner for every capability that isn't
   explicitly overridden** — which is exactly what it already does today,
   since no profile/override mechanism exists yet). This is a strict
   superset of the current behavior, not a replacement: today's
   implementation is the degenerate case of this model where the override
   map is always empty.

> **Callout — `match_events` ownership does not change where the database
> write happens.** `match_events` capability ownership answers "which
> system did a human just click a button in" (GGSP's own UI vs vMix's
> Trigger firing) — not "which system's database is authoritative."
> `app/live/[matchId]/actions.ts`'s `addGoalEvent`/`addMatchEvent`/
> `setLiveStatus` remain the *only* write path to `match_events` regardless
> of who owns this capability, exactly as `BROADCAST_BRIDGE_ARCHITECTURE.md`
> already established. A Phase 2 vMix inbound provider calls those same
> functions; it does not get its own write path. This capability entry
> exists so the Runtime (and later, the UI) can say "vMix is currently the
> one generating match events for this session" without implying a second
> source of truth was introduced.

This is also what makes `BroadcastSession.ts`'s hand-maintained subsystem
array unnecessary going forward — each row becomes `{ capability, owner:
resolveOwner(...), state: <owning provider's health for that capability> }`,
derived, not hand-listed. See section 12.

## 11. Broadcast Events vs Match Events

The Event Bus (section 5) carries two genuinely different kinds of thing
that were both `RuntimeEvent` in the prior revision — splitting them is
what "vMix stopped sending audio" and "a goal was scored" being handled by
completely different subscribers deserves.

**`MatchEvent`** — what happened *in the match*. Sport-specific vocabulary
(the previous doc's `RuntimeEvent`, renamed for clarity now that it has a
sibling):

```ts
type MatchEvent =
  | { kind: "match.goal"; matchId: string; team: "home" | "away"; playerName: string | null; minute: string }
  | { kind: "match.card"; matchId: string; cardType: "yellow" | "second_yellow" | "red"; team: "home" | "away"; playerName: string | null; minute: string }
  | { kind: "match.substitution"; matchId: string; team: "home" | "away"; playerOutName: string | null; playerInName: string | null; minute: string }
  | { kind: "match.statusChange"; matchId: string; statusLabel: string }  // carries Kickoff / Halftime / Fulltime via statusLabel — no separate kinds needed, mirrors live_status today
  | { kind: "match.scoreUpdate"; matchId: string; homeScore: number; awayScore: number };
```

Always originates from a successful `match_events`/`matches` DB write
(section 10's callout). Subscribers: `AutomationPipeline` (outbound
dispatch), `WebsiteSync`, audit logging.

**`BroadcastEvent`** — what happened *to the production*. Domain-agnostic —
these mean the same thing whether the "match" is a football game, a
concert, or a podcast recording (relevant to section 13):

```ts
type BroadcastEvent =
  | { kind: "provider.connected"; providerId: string; matchId: string; at: string }
  | { kind: "provider.disconnected"; providerId: string; matchId: string; at: string }
  | { kind: "stream.started"; providerId: string; matchId: string; at: string }
  | { kind: "stream.stopped"; providerId: string; matchId: string; at: string }
  | { kind: "recording.started"; providerId: string; matchId: string; at: string }
  | { kind: "recording.stopped"; providerId: string; matchId: string; at: string }
  | { kind: "graphics.loaded"; providerId: string; matchId: string; graphicId: string; at: string }
  | { kind: "graphics.failed"; providerId: string; matchId: string; graphicId: string; error: string; at: string }
  | { kind: "replay.ready"; providerId: string; matchId: string; at: string }
  | { kind: "camera.changed"; providerId: string; matchId: string; cameraId: string; at: string }
  | { kind: "audio.lost"; providerId: string; matchId: string; at: string }
  | { kind: "latency.warning"; providerId: string; matchId: string; latencyMs: number; at: string }
  | { kind: "sync.lost"; providerId: string; matchId: string; at: string };
```

Never touches `match_events` or any match-history table — this is
operational telemetry, not match record. Subscribers: the Diagnostics
model (section 12) and, later, operational UI alerting ("Audio Lost,"
"Sync Lost" banners) — not built this pass. Not persisted this pass either:
each event updates in-memory/derived diagnostic state for the duration of
a request, the same way `ProviderHealth` is computed fresh on read today,
not logged to a table. A durable broadcast-events log is a plausible later
addition once a real provider actually emits these (Phase 2+), not before.

## 12. Diagnostics

A read model, not a UI — the shape `getDiagnostics(matchId)` returns, so a
future diagnostics panel (or an API route, or a health-check script) has
one real thing to read instead of assembling it ad hoc:

```ts
interface RuntimeDiagnostics {
  matchId: string;
  currentOperator: BroadcastOperator;
  currentProvider: { id: string; label: string };
  health: ProviderHealth[];                    // one per registered provider, not only the active one
  synchronization: {
    state: "in_sync" | "degraded" | "lost" | "not_applicable";
    lastEventAt?: string;
    clockDriftMs?: number;                     // new — only meaningful when "clock" ownership (section 10) isn't ggsp
  };
  capabilityStatus: Record<BroadcastCapabilityKey, {
    owner: BroadcastOperator;
    state: "active" | "not_configured" | "error";
    detail?: string;
  }>;
  websiteSync: WebsiteSyncStatus[];             // existing WebsiteSync.getProvidersStatus(), unchanged
  databaseStatus: { state: "connected" | "error"; checkedAt: string };
  pendingEventQueue: { count: number; oldestPendingAt?: string };
  generatedAt: string;
}
```

Notes on the fields that don't map onto something that already exists:

- **Clock Drift** — only computable once a capability other than `ggsp`
  owns `clock` (section 10) and that provider's health reports a clock
  reading to diff against GGSP's own. Reads `not_applicable` until Phase 2
  gives a provider a real clock reading to compare.
- **`databaseStatus`** — a trivial Supabase reachability check, genuinely
  buildable today, but scoped out of this pass per the instruction that
  this is architecture, not UI/implementation work yet.
- **`pendingEventQueue`** — today's `dispatch()` is synchronous
  (`Promise.all`, awaited inline in the Server Action) — there is no queue,
  so this reads `{ count: 0 }` honestly until a Phase 2 transport
  introduces real asynchronous inbound handling (e.g. a webhook route that
  enqueues before a handler drains it). This field exists so that future
  transport has a place to report into, not because anything queues today.

`capabilityStatus` supersedes `BroadcastSession.ts`'s hand-maintained
subsystem array — each entry becomes `{ owner: resolveOwner(matchId, key),
state: <that owner's health for this capability> }`, derived from sections
10 and 4 instead of listed by hand. `BroadcastSession.ts` becomes a thin
projection of `RuntimeDiagnostics` (the subset of fields the current
Production Status UI already reads) once the Runtime is wired in — not a
second, independently-maintained model.

## 13. Platform Scope — GGSP-only, or a shared GoodGrafik Platform service?

**Recommendation: design the Runtime as domain-agnostic now (already true
of sections 1–12 as written), but keep it physically inside `lib/broadcast/`
until a second real business module actually needs it.** Don't relocate
code this pass — there's nothing to validate the seam against yet.

The seam is already visible in what's been designed:

| Domain-agnostic (the Runtime core) | Domain-specific (a "business module") |
|---|---|
| `BroadcastProvider`, `ProviderCapabilities`, `BroadcastCapabilityKey`, ownership resolution | `MatchEvent`'s vocabulary (goal/card/substitution) |
| `BroadcastEvent` (provider connected, stream started, recording started, audio lost, sync lost…) | GGSP's `ScoreEngine`/`EventEngine`/`addGoalEvent` and their DB tables |
| `BroadcastProfile`, `BroadcastOutput`, `RuntimeDiagnostics` | Sport-specific UI: `Timeline`, `StatisticsPanel`, `MatchScorePanel` |
| `GraphicsRenderer`, `ProductionQueueEngine`'s take/hide mechanics | What a "graphic" *means* for a given event (a Goal lower third vs a concert setlist card vs a podcast guest name plate) |

Every `BroadcastEvent` kind listed in section 11 (`provider.connected`,
`stream.started`, `recording.started`, `audio.lost`, `sync.lost`…) already
means the same thing for a concert, a podcast recording, or a studio
production as it does for a football match — none of it is
football-specific. Only `MatchEvent` is. That's exactly the seam the user's
long-term vision describes: "only the business modules change — the
broadcast engine should remain the same." A future Culture module recording
a concert would define its own `ConcertEvent` (`setStart`, `encore`,
`intermission`) the same way GGSP defines `MatchEvent` today, publish it to
the same Event Bus, and reuse `BroadcastProvider`/`Profiles`/`Diagnostics`
unchanged.

Why not relocate now: Culture, News, and Studio are still route shells with
honest "In Production" states (per the Master Platform pass) — none of them
has a backend that could actually call into a shared Runtime yet. Moving
`lib/broadcast/` to a platform-level path (e.g. `lib/platform/broadcast-runtime/`)
today would be a mechanical rename with no second caller to prove the
interface boundary is drawn in the right place — exactly the kind of
premature abstraction this codebase's own discipline avoids elsewhere. The
right trigger for the move is "a second business module needs to register
its own event vocabulary against this Runtime," not "the vocabulary could
theoretically support it."

Practically: Phase 2 (vMix, GGSP-only, built inside `lib/broadcast/` as
designed in sections 1–12) is unaffected either way — nothing about
building it inside today's location forecloses moving it later. The move
itself, when it happens, is a path change plus updated imports, not a
redesign, because sections 1–12 are already written without any
GGSP-specific assumption baked into the core interfaces.

---

## Migration path (still not part of this pass)

Once sections 9–13 are approved, in addition to the six steps the prior
revision already listed:

7. `matches.broadcast_profile` (nullable, additive migration) —
   persists which profile, if any, is applied; `null` means today's
   behavior (capability ownership is 1:1 with `broadcast_operator`).
8. `lib/broadcast/runtime/profiles.ts` — `REGISTERED_PROFILES`, the four
   named profiles from section 9.
9. `lib/broadcast/runtime/ownership.ts` — `resolveOwner()`, section 10's
   three-step resolution, `ENGINE_FIXED_CAPABILITIES` as a hard-coded
   invariant list (not overridable by any profile).
10. `BroadcastSession.ts` rewritten as a thin projection over
    `RuntimeDiagnostics.capabilityStatus` (section 12) instead of its own
    hand-maintained array.
11. Phase 2 (real vMix inbound transport) begins — the first thing that
    actually exercises capability ownership (does vMix or GGSP currently
    own `clock`/`graphics`/`match_events` for this match?) and the
    Diagnostics model (is the connection degraded, is there drift) rather
    than the one-directional dispatch alone that Phase 1 could ship
    without either.

## What ships in this pass

This document only, again. No files under `lib/broadcast/` change, no
migration, no UI. `tsc`/`lint`/`test`/`build` are unaffected.

## Explicit non-goals (unchanged, still true)

- No real inbound transport for vMix or OBS.
- No OBS provider, outbound or inbound.
- No Stream URL / Start-Stop / Recording / Replay / Audio / Camera control
  implementation — this revision adds *events and diagnostic fields* for
  these, not control logic.
- No new database tables in this pass — `broadcast_profile` (section 9) is
  specified for Phase 1.5, not created now.
- No relocation of `lib/broadcast/` to a platform-level path (section 13)
  — recommended for later, not done now.
- No change to the Engine/Operator model itself
  (`BROADCAST_BRIDGE_ARCHITECTURE.md`) or to how `match_events` gets
  written to the database (still exclusively
  `app/live/[matchId]/actions.ts`).
