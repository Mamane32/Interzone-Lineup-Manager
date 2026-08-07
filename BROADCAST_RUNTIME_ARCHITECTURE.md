# Production Runtime Architecture

**Status:** Sections 1–8 (the original eight responsibilities — Session
lifecycle, Active Operator, Active Provider, Provider Capabilities,
Health & Synchronization, Event Bus, Graphics Renderer, Outputs) and
sections 9–13 (Profiles, capability-based Source of Truth, the
Match/Broadcast Event split, Diagnostics, Platform Scope) are
**approved**. This revision adds section 0 (naming) and two refinements —
**proposal, pending approval** — before Phase 2 begins:

1. Section 9 (Profiles) is revised to be **provider-independent** —
   a profile declares what a production *needs*, not which software
   supplies it.
2. Section 0 (new) names this architecture the **Production Runtime**,
   with Sports/GGSP as its first business-domain instantiation.

This document, across every revision so far, ships **zero source-file
changes**. No migration, no new `lib/` file, no UI, no folder move, no
rename of any existing identifier. It exists to be reviewed before Phase 2
(the first real provider, vMix) is built.

## 0. Naming: this is a Production Runtime

Everything in this document — Sessions, Providers, Capabilities, Profiles,
the Event Bus, Diagnostics, Outputs — is written in terms that already
don't assume football, or even live sport: a "session" is any production
being produced, a "provider" is any system capable of owning production
capabilities, a "capability" like `graphics`/`audio`/`recording`/`streaming`
means the same thing whether the thing being produced is a match, a
concert, a podcast, or a conference. Calling the whole thing the
**"Broadcast Runtime"** undersells that — "broadcast" implies television/
sport-style production specifically, when the actual design already covers
any live or recorded production.

**This architecture is the Production Runtime.** Sports — via GGSP, using
today's concrete names (`BroadcastEngine`, `BroadcastProvider`,
`BroadcastEvent`, `BroadcastProfile`, `lib/broadcast/`,
`BROADCAST_RUNTIME_ARCHITECTURE.md` itself) — is its **first business-domain
instantiation**, not the whole of it. The long-term list, per the intended
direction: sports productions, concerts, cultural events, podcasts, radio,
television programs, studio productions, conferences. Section 13 covers why
none of the other domains are real yet and what the seam between "Runtime
core" and "business module" looks like concretely.

**Nothing renames or moves in this pass.** Every current identifier
(`BroadcastEngine`, `BroadcastProvider`, `BroadcastEvent`, `BroadcastProfile`,
`BroadcastRuntime`, the `lib/broadcast/` path, this file's own name) keeps
its current "Broadcast"-prefixed name, and the rest of this document
continues to use those names throughout, exactly as before — this section
only establishes the *conceptual* umbrella term. A future rename to
`Production*`/`lib/production/` is a plausible later step, but per explicit
instruction it happens (if it happens) at the same moment as section 13's
relocation trigger — when a second real business-domain module needs the
Runtime — not speculatively now, and not as a mechanical find-and-replace
with nothing yet depending on the new names.

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

**New concept, revised in this pass to be provider-independent.** A profile
describes what a production *requires*, not which software supplies it —
"Television Production needs graphics, replay, recording, streaming, audio,
and camera control" is a true statement regardless of whether vMix, OBS, or
some future provider is what actually satisfies it this year. The Runtime
resolves *which registered provider* fulfills each requirement at the
moment a profile is applied — the profile itself never names a provider.

```ts
interface BroadcastProfile {
  id: string;                 // "interzone_production" | "friendly_match" | "television_production" | "studio_production"
  label: string;
  description?: string;
  requiredCapabilities: BroadcastCapabilityKey[];  // what the production needs — never which provider supplies it
  enabledOutputs: string[];                        // subset of REGISTERED_OUTPUTS ids
}
```

No `defaultOperator`, no `capabilityOwnership` map, no `requiredProviders`
list authored by hand — those were this section's first-draft shape, and
named `vmix`/`obs` directly, which is exactly what this revision removes.
`website` and `statistics` never appear in `requiredCapabilities` for any
profile — they're Engine-fixed (section 10) regardless of what a profile
asks for, so listing them would be redundant, not merely useless.

The four requested profiles, concretely — now expressed purely as
requirements:

| Profile | `requiredCapabilities` |
|---|---|
| **Interzone Production** | `graphics`, `replay`, `recording`, `streaming`, `audio`, `camera` — exactly the user's example |
| **Friendly Match** | *(none)* — GGSP standalone already covers everything an informal match needs; differs from Interzone Production only in `enabledOutputs` (no program/preview needed) |
| **Television Production** | `graphics`, `replay`, `recording`, `streaming`, `audio`, `camera`, `clock`, `commentary` — the same production-grade set as Interzone Production, plus master-clock sync and commentary mixing a full broadcast adds |
| **Studio Production** | `graphics`, `audio`, `recording` — a studio taping needs neither replay nor camera switching nor a public stream |

### Resolution: how the Runtime picks a provider per requirement

```ts
function resolveProfile(
  profile: BroadcastProfile,
  providers: BroadcastProvider[]   // REGISTERED_PROVIDERS, in registration order
): Partial<Record<BroadcastCapabilityKey, BroadcastOperator>> {
  const resolved: Partial<Record<BroadcastCapabilityKey, BroadcastOperator>> = {};

  for (const capability of profile.requiredCapabilities) {
    if (ENGINE_FIXED_CAPABILITIES.includes(capability)) continue; // never resolved to anything but ggsp — section 10 handles it directly

    const eligible = providers.filter((p) => p.capabilities.canOwn.includes(capability));
    resolved[capability] = selectBest(capability, profile, eligible)?.id ?? "ggsp"; // honest fallback, never throws — see below
  }

  return resolved;
}
```

`selectBest()` is the "most appropriate provider" the user asked for.
Three deterministic rules, in order, so the same inputs always produce the
same answer — no hidden state, nothing that depends on request timing:

1. **Prefer a provider that's currently `connected`** (its
   `getHealth().state`) over one that's merely capable-on-paper but
   `not_configured`/`error`. A provider nobody can currently reach is never
   "most appropriate," no matter what it declares.
2. **Among connected candidates, prefer whichever single provider covers
   the most of the profile's other required capabilities**, not just this
   one — i.e. resolve the whole profile against one provider bundle first
   before splitting capabilities across several. This is where the
   resolution honestly reflects what's real today rather than what's
   wished for: `vmix.capabilities.canOwn` today is only `["graphics",
   "clock"]` (section 10) — `VMixEngine.ts` has no real translation for
   recording/replay/audio/camera control yet, matching
   `BROADCAST_BRIDGE_ARCHITECTURE.md`'s own non-goals. Applying Interzone
   Production *today* resolves `graphics` and `clock` to `vmix`, and
   leaves `replay`/`recording`/`streaming`/`audio`/`camera` as honest gaps
   (rule 4 below) — not because the profile is wrong, but because no
   registered provider claims those capabilities yet. As `VMixEngine`
   (or a later `ObsEngine`) genuinely grows recording/replay/audio/camera
   support, `canOwn` grows to match, and the exact same
   `interzone_production` profile — unedited — starts resolving more of
   its requirements automatically. That's the point of keeping profiles
   provider-independent: the profile doesn't change as capabilities get
   built out for real; only what `canOwn` declares does.
3. **Tie-break by registration order** in `REGISTERED_PROVIDERS` — the same
   "first one wins, no magic" rule `BroadcastEngine.REGISTERED_SYSTEMS` and
   `ProductionQueueEngine.REGISTERED_CONSUMERS` already use elsewhere in
   this layer.
4. **If nothing eligible is connected at all**, fall back to `ggsp` if
   `ggsp.capabilities.canOwn` includes the capability, otherwise report it
   `not_configured` in Diagnostics (section 12) — a profile can declare a
   requirement no currently-registered provider can meet yet (e.g.
   `streaming` before any provider really implements stream control); that
   requirement resolves to an honest gap, never a silent no-op and never a
   thrown error.

**Resolution runs once, at the moment a profile is applied to a match — not
continuously.** If the resolved provider's health degrades mid-session
(vMix disconnects halfway through Television Production), the Runtime does
**not** silently re-resolve and hand ownership to a different provider —
that would mean production state moving out from under a live operator
without anyone choosing it. The degraded state surfaces in Diagnostics
(section 12) instead, and re-resolving is a deliberate, operator-triggered
action (re-applying the profile, or a manual override), never automatic
failover. This is a design decision, not a gap to fill later — automatic
mid-session failover is explicitly out of scope, called out again in
Explicit non-goals below.

Profiles are a hardcoded registry (`REGISTERED_PROFILES: BroadcastProfile[]`),
the same pattern as `REGISTERED_SYSTEMS`/`REGISTERED_OUTPUTS` — not a
database table. An admin-editable profile builder is a plausible later
step, but nothing today needs more than these four named presets; adding a
DB-backed builder ahead of a real request for custom profiles would be
speculative generality.

Applying a profile to a match means calling `resolveProfile()` and
persisting its *output* as that match's capability-ownership override map
(section 10's step 2) — this is Phase 1.5 wiring, including one additive
migration (`matches.broadcast_profile`, nullable, defaulting to `null` =
"no profile applied, capability ownership is 1:1 with
`broadcast_operator`" — the current behavior, unchanged). Not built this
pass.

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
2. Else if the match's applied profile resolved an owner for that key
   (section 9's `resolveProfile()` output — not authored on the profile
   directly, computed against whichever providers are actually connected
   at apply time) → use it.
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
of sections 0–12 as written — see section 0's Production Runtime naming),
but keep it physically inside `lib/broadcast/`, under its current
`Broadcast`-prefixed names, until a second real business module actually
needs it.** Don't relocate or rename code this pass — there's nothing to
validate the seam against yet.

The seam is already visible in what's been designed:

| Domain-agnostic (the Production Runtime core) | Domain-specific (a "business module") |
|---|---|
| `BroadcastProvider`, `ProviderCapabilities`, `BroadcastCapabilityKey`, ownership resolution, `BroadcastProfile`'s `requiredCapabilities` model (section 9) | `MatchEvent`'s vocabulary (goal/card/substitution) |
| `BroadcastEvent` (provider connected, stream started, recording started, audio lost, sync lost…) | GGSP's `ScoreEngine`/`EventEngine`/`addGoalEvent` and their DB tables |
| `BroadcastOutput`, `RuntimeDiagnostics` | Sport-specific UI: `Timeline`, `StatisticsPanel`, `MatchScorePanel` |
| `GraphicsRenderer`, `ProductionQueueEngine`'s take/hide mechanics | What a "graphic" *means* for a given event (a Goal lower third vs a concert setlist card vs a podcast guest name plate) |

Every `BroadcastEvent` kind listed in section 11 (`provider.connected`,
`stream.started`, `recording.started`, `audio.lost`, `sync.lost`…), and now
every `BroadcastProfile` (section 9, provider-independent by construction)
already means the same thing whether the production being run is a
football match, a concert, a podcast recording, a radio broadcast, a
television program, a studio session, or a conference — none of it is
football-specific. Only `MatchEvent` is. That's exactly the seam the user's
long-term vision describes: "only the business modules change — the
production engine remains the same." A future Culture module recording a
concert would define its own `ConcertEvent` (`setStart`, `encore`,
`intermission`) the same way GGSP defines `MatchEvent` today, register its
own "Concert Production" profile against the same `requiredCapabilities`
model, publish to the same Event Bus, and reuse
`BroadcastProvider`/Diagnostics unchanged. A Studio/Podcast module would do
the same with an `EpisodeEvent` vocabulary and its own profiles (e.g.
"Podcast Recording" requiring only `audio` and `recording`).

Why not relocate — or rename — now: Culture, News, and Studio are still
route shells with honest "In Production" states (per the Master Platform
pass); none of them has a backend that could actually call into a shared
Runtime yet, and none of the other domains in the long-term list (concerts,
cultural events, podcasts, radio, television programs, conferences) exist
in this codebase at all. Moving `lib/broadcast/` to a platform-level path
(e.g. `lib/production/`) or renaming `Broadcast*` identifiers to
`Production*` today would be a mechanical change with no second caller to
prove the interface boundary — and the naming — is drawn in the right
place. That's exactly the kind of premature abstraction this codebase's
own discipline avoids elsewhere. The right trigger for both the move and
the rename is the same moment: "a second business module needs to register
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
   named profiles from section 9, each as `requiredCapabilities` only —
   no provider names authored anywhere in this file.
9. `lib/broadcast/runtime/resolveProfile.ts` — section 9's `resolveProfile()`
   + `selectBest()`, run once when a profile is applied to a match; its
   output is what gets persisted as that match's capability-ownership
   override map (feeding section 10's `resolveOwner()` step 2).
10. `lib/broadcast/runtime/ownership.ts` — `resolveOwner()`, section 10's
    three-step resolution, `ENGINE_FIXED_CAPABILITIES` as a hard-coded
    invariant list (not overridable by any profile or resolution).
11. `BroadcastSession.ts` rewritten as a thin projection over
    `RuntimeDiagnostics.capabilityStatus` (section 12) instead of its own
    hand-maintained array.
12. Phase 2 (real vMix inbound transport) begins — the first thing that
    actually exercises capability ownership (does vMix or GGSP currently
    own `clock`/`graphics`/`match_events` for this match?) and the
    Diagnostics model (is the connection degraded, is there drift) rather
    than the one-directional dispatch alone that Phase 1 could ship
    without either.

A `Broadcast*` → `Production*` rename and a `lib/broadcast/` →
`lib/production/` move (section 0, section 13) are **not** part of this
numbered sequence — they happen later still, only once a second
business-domain module (Culture's concerts, Studio's podcasts, or another)
is real enough to need the Runtime, per section 13's trigger condition.

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
- No relocation of `lib/broadcast/` to a platform-level path, and no
  rename of any `Broadcast*` identifier to `Production*` (sections 0, 13)
  — both recommended for later, together, not done now.
- No automatic mid-session failover — if a resolved provider's health
  degrades after a profile has been applied, the Runtime surfaces that in
  Diagnostics (section 12) but does not silently re-resolve ownership to a
  different provider; re-resolution is always a deliberate, operator-
  triggered action (section 9).
- No change to the Engine/Operator model itself
  (`BROADCAST_BRIDGE_ARCHITECTURE.md`) or to how `match_events` gets
  written to the database (still exclusively
  `app/live/[matchId]/actions.ts`).
