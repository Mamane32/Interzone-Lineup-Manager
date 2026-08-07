# Broadcast Runtime Architecture

**Status: design proposal, not implemented.** No source file changes ship with
this document. It exists to be reviewed and approved before Phase 2 (the
first real provider, vMix) is built on top of it. See "What ships in this
pass" at the end.

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
and its own ad hoc capability checks scattered through UI components
(`current === "obs"` disabled-with-"Soon" logic in
`BroadcastOperatorControl.tsx` today, for instance). Multiply that by OBS,
Companion, HTML Graphics, and every future provider, and each one is
re-deriving the same four wiring steps independently — exactly what the
brief means by "providers implementing independent logic" instead of
plugging into one thing.

**The Runtime is the fifth piece that doesn't exist yet: the thing that owns
all four registries as one coherent object per match**, so a provider is
written once, against one interface, and automatically gets outbound
dispatch, inbound events, status display, and capability-gated UI for free.

## The eight responsibilities, and where each one comes from

### 1. Broadcast Session lifecycle

A **session** is "GGSP is actively producing this match" — distinct from
`matches.live_status` (the match clock's own state machine: pre_match →
live → halftime → ended). A session can be `idle` before any operator has
touched the match, `active` once an operator is selected and the match
enters live production, and `ended` once the match report is finalized.
Session state gates things live_status alone doesn't: e.g. "was any
provider ever connected for this match" (useful for the eventual match
report / broadcast audit trail), not "is the ball currently in play."

This is a **derived state**, not new persistence — the same discipline
`BroadcastSession.ts` already follows ("no `broadcast_sessions` table,"
composed from what already exists). Session state derives from
`matches.live_status` plus whether `matches.broadcast_operator` has ever
been set to something other than the default, plus whether any provider has
reported `connected` health at any point. No schema change for this piece.

### 2. Active Operator

Already real: `matches.broadcast_operator` (migration 035),
`setBroadcastOperator()`, `BroadcastOperatorControl.tsx`. The Runtime
doesn't replace this — it becomes the thing that *reads* it to resolve
which `BroadcastProvider` instance (see below) is active for a match, and
the thing every other responsibility (dispatch, events, renderer, outputs)
asks first before doing anything provider-specific.

### 3. Active Provider

**New concept.** Today "ggsp" is a string default with no object behind it
— `VMixEngine` is a real registered `BroadcastSystemEngine`, but there is no
equivalent `GgspProvider` object; GGSP-as-operator is handled by inline
`if (operator !== "ggsp")` checks in the two `broadcast-output` pages
instead of being a first-class provider like any other.

The Runtime introduces **`BroadcastProvider`** — one interface that unifies
what `BroadcastSystemEngine` (outbound) and `BroadcastBridgeProvider`
(inbound) each cover today, plus the two things neither covers
(capabilities, health/sync):

```ts
interface BroadcastProvider {
  readonly id: BroadcastOperator;       // "ggsp" | "vmix" | "obs" | future ids
  readonly label: string;
  readonly capabilities: ProviderCapabilities;

  getHealth(): Promise<ProviderHealth>;

  // Outbound: Runtime -> Provider. Exactly BroadcastSystemEngine.send()
  // today; GgspProvider's implementation renders internally instead of
  // calling an external API (see "Graphics Renderer" below).
  dispatch(command: BroadcastCommand): Promise<BroadcastCommandResult>;

  // Inbound: Provider -> Runtime. Only meaningful when
  // capabilities.sourcesMatchEvents is true. A provider registers its own
  // transport (webhook route, poll loop, WebSocket client — see
  // BROADCAST_BRIDGE_ARCHITECTURE.md's Phase 2 options) and calls this to
  // hand the Runtime a normalized event once one arrives. No inbound
  // transport exists yet for any provider — this method exists on the
  // interface so Phase 2 has a defined place to call into, not because
  // anything calls it today.
  onProviderEvent?(handler: (event: RuntimeEvent) => Promise<void>): void;
}
```

Every provider — including `ggsp` itself — is a registered instance of
this interface. Standalone Mode stops being "the absence of a provider"
and becomes "the `ggsp` provider is active," which is what makes
capability-gating (#4) and the Graphics Renderer split (#7) uniform instead
of special-cased.

`REGISTERED_PROVIDERS: BroadcastProvider[] = [GgspProvider, VMixProvider]`
(OBS and later providers appended the same way) replaces
`BroadcastEngine.REGISTERED_SYSTEMS` and `BroadcastBridge.REGISTERED_BRIDGE_PROVIDERS`
as two views of the same list, not two lists.

### 4. Provider Capabilities

**New concept**, replacing ad hoc checks like `BroadcastOperatorControl.tsx`'s
current `operator === "obs"` → hardcoded "Soon" badge. A provider declares
what it can actually do, and UI reads the declaration instead of
special-casing provider ids:

```ts
interface ProviderCapabilities {
  operatesGraphics: boolean;         // renders its own output (ggsp: true; vmix/obs: true once producing; a bare "notify-only" provider: false)
  receivesGraphicsCommands: boolean; // accepts outbound dispatch() for score/graphics
  sourcesMatchEvents: boolean;       // can be Mode B's authoritative event source
  streamControl: boolean;            // start/stop stream — reserved, no provider implements yet
  recordingControl: boolean;         // reserved
  replayControl: boolean;            // reserved
  audioControl: boolean;             // reserved
}
```

Today's real values: `ggsp` = `{ operatesGraphics: true, receivesGraphicsCommands: true, sourcesMatchEvents: false, ...rest false }`.
`vmix` = `{ operatesGraphics: true, receivesGraphicsCommands: true, sourcesMatchEvents: false, ...rest false }`
— note `sourcesMatchEvents` is honestly `false` for vMix today, because no
inbound transport exists yet (Phase 2). Once Phase 2 lands a real inbound
transport, that one field flips to `true` and every UI reading capabilities
(not a hardcoded id check) picks it up automatically. `obs` isn't registered
at all yet — an unregistered id, not a provider with all-false capabilities
— matching migration 035's honest "reserved in the schema, not yet a real
choice" framing already in `BroadcastOperatorControl.tsx`.

This is also what `BroadcastSession.ts`'s hand-maintained subsystem array
becomes: instead of manually listing `{ key: "vmix", state: ... }`, the
Runtime derives each subsystem row from `provider.capabilities` +
`provider.getHealth()` for whichever provider is active — one source
instead of two things that can drift out of sync.

### 5. Health & Synchronization

**Health** is what `BroadcastSystemStatus`/`BroadcastConnectionState`
already model (`not_configured` | `connected` | `error`) — the Runtime's
`ProviderHealth` is that same shape, generalized to any provider, with one
addition:

```ts
interface ProviderHealth {
  providerId: string;
  state: "not_configured" | "connected" | "degraded" | "error";
  detail?: string;
  lastEventAt?: string;   // new — last time this provider's data was known-fresh
  checkedAt: string;
}
```

`degraded` is new too: "connected, but stale" — e.g. vMix answers status
pings but hasn't sent an inbound event in longer than expected during an
active session. Neither `not_configured`/`connected`/`error`
(`lib/vmix/client.ts`'s three states today) captures that; `degraded` does,
without inventing a whole new health model.

**Synchronization** is genuinely new — nothing today compares "what GGSP's
database believes" against "what the active provider is actually showing."
It only matters for a provider with `sourcesMatchEvents: true` (Mode B): if
vMix is the operator and stops sending events (network drop, an operator
who stopped clicking triggers, a misconfigured Trigger), GGSP's DB is still
the source of truth and nothing breaks, but an operator watching GGSP's own
UI has no way to know the feed went stale. `sync()` is informational only —
it flags drift in the UI (`ProductionStatusPanel`, most likely), it never
blocks a write or forces a fallback. Whether "stale" means "no inbound event
in N seconds" or something richer is a Phase 2 decision once a real
transport exists to observe; this document only reserves the concept and
the `lastEventAt` field it depends on.

### 6. Event Bus

**New concept**, and the one with the most leverage. Today, "a goal
happened" fans out via hardcoded sequential calls inside
`app/live/[matchId]/actions.ts`'s `addGoalEvent`:

```ts
// today, addGoalEvent, abbreviated
await supabase.from("match_events").insert(...);   // the DB write — source of truth
await afterBroadcastEvent(async () => {
  await broadcastScoreUpdate({ matchId, homeScore, awayScore });  // -> AutomationPipeline -> BroadcastEngine
  await broadcastGoal({ matchId, team, playerName, minute });     // -> AutomationPipeline -> BroadcastEngine
});
```

Every new subscriber to "a goal happened" today means editing this Server
Action to add another call. The Event Bus makes "a goal happened" a value
subscribers register for, instead of a call site every subscriber has to be
manually added to:

```ts
type RuntimeEvent =
  | { kind: "match.goal"; matchId: string; team: "home" | "away"; playerName: string | null; minute: string }
  | { kind: "match.card"; matchId: string; cardType: "yellow" | "second_yellow" | "red"; team: "home" | "away"; playerName: string | null; minute: string }
  | { kind: "match.substitution"; matchId: string; team: "home" | "away"; playerOutName: string | null; playerInName: string | null; minute: string }
  | { kind: "match.statusChange"; matchId: string; statusLabel: string }
  | { kind: "match.scoreUpdate"; matchId: string; homeScore: number; awayScore: number };

type RuntimeEventSubscriber = (event: RuntimeEvent) => Promise<void>;
```

`RuntimeEvent` is deliberately the same domain vocabulary
`BroadcastCommand` already uses (this document does not invent a second
event language) — it's published from exactly one place regardless of
which Mode is active:

- **Mode A (ggsp operator):** published from inside the Server Action,
  right after the DB write succeeds — same moment `afterBroadcastEvent`
  fires today.
- **Mode B (vmix/obs operator):** published from inside that provider's
  inbound handler (`onProviderEvent`, #3 above) — but *only after* it has
  called the same Server Action to perform the DB write. The DB write
  stays the single source of truth in both modes; the Event Bus publish is
  always the step after, never a replacement for it.

Subscribers: `AutomationPipeline` (turns the event into outbound
`dispatch()` calls — what `ScoreEngine`/`EventEngine` do today, unchanged
in behavior, just invoked as a subscriber instead of a direct call chain),
`WebsiteSync`, audit logging, and any future subscriber (notifications,
analytics) — added by registering a new subscriber function, never by
editing `actions.ts` again.

### 7. Graphics Renderer abstraction

Formalizes a distinction that already exists as an inline `if` in two
files today (`app/broadcast-output/[matchId]/{program,preview}/page.tsx`):

```ts
interface GraphicsRenderer {
  readonly providerId: BroadcastOperator;
  isActive(operator: BroadcastOperator): boolean;
}
```

`GgspRenderer.isActive(operator)` returns `operator === "ggsp"` — when
true, GGSP composites its own output from `ProductionQueueEngine`
(unchanged: `ProductionOutputFrame`, the existing polling output surface).
Every external provider's renderer (`VMixRenderer`, a future `ObsRenderer`)
returns `isActive(operator) === operator === thatProvider.id`, and when
active means "rendering happens inside that external system, outside
GGSP's process" — GGSP's own output shows `OperatorHandoffNotice` instead,
exactly as it does today. The interface doesn't change what already ships
(the handoff notice, the stand-down behavior); it names the concept so a
third provider doesn't need its own bespoke `if` chain in the output pages
— the pages ask "which renderer is active for this operator" once, generically.

### 8. Outputs

**New concept**, currently implicit as "there are two Next.js routes,
`program` and `preview`." An `Output` is a registered destination that
consumes a `GraphicsRenderer` + the current session:

```ts
interface BroadcastOutput {
  readonly id: string;      // "program" | "preview" | future: "scoreboard-only", "lower-third-only"
  readonly path: string;    // the route that serves it
}

const REGISTERED_OUTPUTS: BroadcastOutput[] = [
  { id: "program", path: "/broadcast-output/[matchId]/program" },
  { id: "preview", path: "/broadcast-output/[matchId]/preview" },
];
```

Today both existing outputs are GGSP-only (full compositing, gated by
Active Operator as described above). The registry exists so a future
narrower output — e.g. a scoreboard-only URL meant as an OBS Browser
Source layer, which is a fundamentally different rendering concern than
"is GGSP or vMix the operator" — is an addition to this array, not a new
ad hoc route pattern invented from scratch each time.

## How this composes: `BroadcastRuntime`

One façade per match, replacing direct calls to `BroadcastEngine`,
`BroadcastBridge`, and `BroadcastSession` from UI/action code:

```ts
interface BroadcastRuntime {
  getSession(matchId: string): Promise<BroadcastSession>;         // #1, composed from #3+#4+#5
  getActiveProvider(matchId: string): Promise<BroadcastProvider>; // #2 resolved to #3
  dispatch(matchId: string, command: BroadcastCommand): Promise<BroadcastCommandResult[]>; // fans out to every provider with receivesGraphicsCommands, not just the active one — matches today's BroadcastEngine.dispatch() sending to all registered systems
  publish(event: RuntimeEvent): Promise<void>;                    // #6
  getRenderer(matchId: string): Promise<GraphicsRenderer>;        // #7
  outputs: BroadcastOutput[];                                     // #8
}
```

`BroadcastEngine.dispatch()`'s existing "send to every registered system in
parallel, never throw on one system's failure" behavior is preserved
exactly — `dispatch` fans out to every provider capable of receiving
commands, not only the active operator's provider, because outbound
graphics commands matter regardless of who's operating (a scoreboard
overlay provider could run alongside an operator provider in the future).
Only the *inbound* direction is exclusive to the one active operator.

## Migration path (not part of this pass — sequencing for Phase 1.5)

Once this document is approved, wiring the Runtime in is additive and
staged, in this order:

1. `lib/broadcast/runtime/types.ts` — `BroadcastProvider`,
   `ProviderCapabilities`, `ProviderHealth`, `RuntimeEvent`.
2. `lib/broadcast/runtime/GgspProvider.ts` — makes Standalone Mode a real
   registered `BroadcastProvider` for the first time (wraps the existing
   `ProductionQueueEngine`/`ProductionOutputFrame` behavior; changes no
   behavior, just gives it an object).
3. `lib/broadcast/runtime/BroadcastRuntime.ts` — the façade above, composed
   from the *existing* `BroadcastEngine`/`BroadcastBridge`/
   `BroadcastSession`/`ProductionQueueEngine` internally at first (a
   composition layer, not a rewrite of any of them).
4. Update `VMixEngine.ts` to also declare `capabilities` and expose the
   unified `BroadcastProvider` shape — still zero behavior change, since
   its `dispatch`/`getStatus` logic is untouched.
5. Point `BroadcastOperatorControl.tsx`, `ProductionStatusPanel`, and the
   two `broadcast-output` pages at `BroadcastRuntime` instead of importing
   `BroadcastEngine`/`match.broadcast_operator ?? "ggsp"` inline — this is
   where the capability-driven "Soon" badge (#4) replaces the current
   hardcoded `operator === "obs"` check.
6. Only after all of the above is real: **Phase 2**, a real `VMixProvider`
   inbound transport (per the three options `BROADCAST_BRIDGE_ARCHITECTURE.md`
   already lists — Triggers/webhook, polling, or, for OBS specifically,
   its WebSocket API), which is the first thing that actually needs this
   Runtime to exist, since it's the first provider whose behavior depends
   on capability-gating and the Event Bus rather than one-directional
   dispatch alone.

## What ships in this pass

This document only. No files under `lib/broadcast/`, no UI components, no
migrations change. `tsc`/`lint`/`test`/`build` are unaffected because
nothing executable changed — this is a design proposal for review, per the
explicit instruction not to begin provider-specific implementation (vMix
polling, webhooks, OBS, Stream URL, Replay, Recording, etc.) until the
Runtime architecture above is approved.

## Explicit non-goals (still, as of this document)

- No real inbound transport for vMix or OBS (Phase 2, blocked on approval
  of this document).
- No OBS provider, outbound or inbound.
- No Stream URL / Start-Stop / Recording / Replay / Audio / Camera control
  — `ProviderCapabilities` reserves the fields; nothing implements them.
- No new database tables — Session lifecycle (#1) stays a derived read
  model, matching `BroadcastSession.ts`'s existing discipline.
- No change to the Engine/Operator model itself
  (`BROADCAST_BRIDGE_ARCHITECTURE.md`) — this document is the next layer
  down (how providers plug in), not a revision of that decision.
