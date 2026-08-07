# Broadcast Bridge Architecture — GGSP is the Engine, not an Operator

## The reframing this document captures

The previous assumption baked into `lib/broadcast/` (see `VMIX_INTEGRATION.md`)
was that GGSP's own Broadcast Control Center is *always* the operator, and
vMix is something it optionally notifies on the side. That's not the
intended model.

**GGSP is the Engine.** It is always the source of truth for match state,
and it is always what updates the public site (GGScoreLive), statistics,
standings, notifications, and APIs — regardless of what's producing the
broadcast.

**The Operator is a separate, per-match, runtime-selectable role.**
Exactly one system is the operator for a given match at a given time:

- **`ggsp`** (Standalone Mode) — a human operates directly inside GGSP's
  own Broadcast Control Center. GGSP is both Engine and Operator, and
  GGSP renders its own graphics (`app/broadcast-output/[matchId]/{program,preview}`).
- **`vmix`** (Broadcast Mode) — a human operates inside vMix directly.
  vMix's actions are authoritative; GGSP finds out about them and updates
  its own state as a result, not the other way around. GGSP's own
  graphics output stands down — vMix renders instead.
- **`obs`** — reserved for a future OBS provider. Selectable in the
  schema so a later migration isn't needed, but there is no OBS
  integration on either side yet.

GGSP is not a vMix application and not an OBS application. vMix and OBS
are Broadcast Providers the Engine can hand operator duties to — never a
dependency the Engine requires to function. GGScoreLive (the public site)
never touches any of this either way; see the note in `VMIX_INTEGRATION.md`.

## What already existed (and what it actually was)

Before this pass, `lib/broadcast/` already had a real, working
**outbound** provider abstraction — `BroadcastEngine`/`BroadcastSystemEngine`
(`types.ts`, `BroadcastEngine.ts`, `VMixEngine.ts`): GGSP-as-operator
telling a registered production system what happened (`dispatch()`), and
reading that system's status (`getSystemsStatus()`). That's genuinely the
right shape for "GGSP Engine → Graphics Command → vMix" in Broadcast Mode
— it didn't need to be replaced, just correctly scoped and (per a
separate, already-landed fix) no longer bypassed by UI code reaching past
it into `lib/vmix/client` directly.

What didn't exist: anything in the *other* direction — a production
system telling GGSP what happened. Every match-event write
(`app/live/[matchId]/actions.ts`'s `addGoalEvent`, `addMatchEvent`,
`setLiveStatus`) has exactly one entry point: the GGSP Broadcast Control
Center's own Server Actions, gated to `broadcast_operator`/`admin`/
`super_admin`. There was no path for "vMix says a goal happened" to reach
those functions at all.

## What this pass built (Phase 1 — the abstraction, verified clean)

Scoped deliberately to "an integration that lets the Broadcast Center
talk to the provider," not the full automatic pipeline — per explicit
direction, that pipeline is Phase 2+.

1. **`matches.broadcast_operator`** (migration 035) — `'ggsp' | 'vmix' |
   'obs'`, defaults to `'ggsp'`. A real, persisted, per-match Active
   Operator. Every existing match keeps behaving exactly as it does today
   (the only operator surface that has ever existed) since the default
   matches current behavior exactly.
2. **`setBroadcastOperator(matchId, operator)`**
   (`app/live/[matchId]/actions.ts`) — a real Server Action, gated the
   same as every other action in that file. Purely a mode switch: it
   doesn't move data or require the chosen system to be connected.
3. **`BroadcastOperatorControl`** (`components/live/BroadcastOperatorControl.tsx`)
   — a real, working "Current Operator: GGSP / vMix / OBS" selector in
   the Broadcast Control Center's Production Status tab. OBS is shown
   disabled/"Soon" — selectable in the schema, not yet a real choice in
   the UI, since choosing it today would do nothing useful.
4. **GGSP's own graphics stand down in Broadcast Mode** —
   `app/broadcast-output/[matchId]/{program,preview}` now check the
   match's active operator before rendering. When it isn't `'ggsp'`, they
   show `OperatorHandoffNotice` (a clear "Active Operator: vMix — capture
   that system's output instead" slate) instead of GGSP's own compositing.
5. **`lib/broadcast/BroadcastBridge.ts`** — the inbound counterpart to
   `BroadcastEngine`, matching the exact "real plumbing, honest empty
   registry" pattern `WebsiteSync.ts` and `lib/vmix/client.ts` already
   established. `BroadcastBridgeProvider` is the interface every future
   inbound provider implements; `REGISTERED_BRIDGE_PROVIDERS` is empty —
   there is no real transport (webhook receiver, polling loop, vMix
   Trigger listener, OBS WebSocket client) for either vMix or OBS today.
6. **`tests/characterization/architecture-guards.test.ts`** — a permanent
   guard (added alongside the outbound-layer bypass fix) failing the
   build if any file outside `lib/broadcast/VMixEngine.ts` imports
   `lib/vmix/client` directly, so the Engine/provider boundary can't
   silently erode again.

## What Phase 2 actually requires (not built — here's why)

The real "vMix tells GGSP a goal happened" pipeline needs a concrete
transport decision this pass deliberately doesn't make, because it can't
be verified without a real vMix instance to test against (same standing
limitation as the rest of this vMix integration — see
`VMIX_INTEGRATION.md`'s "Why this exists now, and what it isn't yet"):

- **vMix Triggers/Web Controller calling a GGSP webhook** — vMix can fire
  an HTTP request on certain internal events; a new
  `app/api/broadcast-bridge/[matchId]/route.ts` would receive it,
  authenticate it, and translate the payload into a call to
  `addGoalEvent`/`addMatchEvent`/`setLiveStatus`.
- **A polling `BroadcastBridgeProvider`** — periodically calls vMix's own
  status API (the same one `lib/vmix/client.ts` already polls for
  connectivity) and diffs against last-known state to infer events. Lower
  fidelity than triggers (no player name, no minute precision beyond the
  poll interval) but needs zero vMix-side configuration.
- **OBS's WebSocket API** — real-time, well-documented, likely the
  cleanest transport once an `obs` provider is built — but it's a second
  provider, not the first one, per explicit direction.

Whichever transport is chosen, the destination doesn't change: a real
`BroadcastBridgeProvider` translates its system's native event into a
call to the exact same three Server Action functions the GGSP UI already
calls. GGSP's database write path stays the single source of truth either
way — only where the call originates does.

## Non-goals for this pass (explicit)

- No automatic vMix → GGSP event pipeline (Phase 2, above).
- No OBS provider, outbound or inbound.
- No per-capability status (Stream URL, Start/Stop, Graphics/Recording/
  Replay/Audio/Camera) — `lib/broadcast/BroadcastSession.ts`'s
  `BroadcastSubsystemKey` union already reserves the shape for these;
  filling them in with real state is separate, later work.
