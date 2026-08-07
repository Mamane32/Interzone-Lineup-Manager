# vMix Integration — Architecture

This is the design for connecting GGSP's Broadcast Control Center to a real
vMix instance. Per the brief that requested it: **no faked connections
anywhere in this document or the code it describes.** Every "connected"
state shown in the UI is the result of a real HTTP call; every command
listed below is a real vMix Function, not an invented one.

## Why this exists now, and what it isn't yet

There is no vMix instance reachable from this project's environment —
development or production. This is architecture and a real, working client
built *ahead of* having something to point it at, not a working
integration. The milestone that follows this document is: **GGSP
successfully sends one command to a real vMix instance.** That hasn't
happened yet.

## GGScoreLive never depends on any of this

GGScoreLive (the public site — `app/scores/**`, `app/match/**`, and the
rest of the `app/(goodgrafik)/sports` entry point) reads match state
directly from Supabase and always has. Nothing described in this document
sits between GGScoreLive and its data — vMix, OBS, or any future
production system is purely something the *operator-facing* Broadcast
Control Center talks to. The public site works identically whether zero,
one, or several production systems are connected.

## Broadcast Integration Layer — vMix is a provider, not a dependency

`lib/broadcast/` is the mediator between the Broadcast Control Center and
whichever production system(s) are actually connected — GGSP is not wired
to vMix specifically anywhere above this layer:

```
lib/broadcast/types.ts          BroadcastCommand (system-agnostic — "a goal
                                 happened", never "call vMix's SetText"),
                                 BroadcastSystemStatus, and the
                                 BroadcastSystemEngine interface every
                                 provider implements: getStatus(), send().
lib/broadcast/BroadcastEngine.ts  REGISTERED_SYSTEMS (today: [VMixEngine])
                                 plus dispatch() (send one command to every
                                 registered system) and
                                 getSystemStatus(id)/getSystemsStatus()
                                 (read status through the layer). This is
                                 the ONLY object UI/session code should
                                 import to ask "is vMix connected" — never
                                 lib/vmix/client directly. A characterization
                                 test (tests/characterization/
                                 architecture-guards.test.ts) fails the
                                 build if any file outside
                                 lib/broadcast/VMixEngine.ts imports
                                 lib/vmix/client.
lib/broadcast/VMixEngine.ts     The vMix implementation of
                                 BroadcastSystemEngine — the only file
                                 allowed to import lib/vmix/client.
```

Adding OBS (or Ross, Vizrt, CasparCG) later means writing `ObsEngine.ts`
implementing the same `BroadcastSystemEngine` interface and adding it to
`REGISTERED_SYSTEMS` — no change anywhere else, since every caller above
`BroadcastEngine` only ever asks the layer, never a concrete system. For
this first pass, that's the whole scope: a real, provider-agnostic path
from the Broadcast Center to whichever system(s) are registered. Per-
capability status (stream URL, start/stop, Graphics/Recording/Replay/
Audio/Camera status) is intentionally not modeled yet — see
`lib/broadcast/BroadcastSession.ts`'s `BroadcastSubsystemKey` union for
the reserved shape those will eventually fill.

## How vMix's API actually works

vMix exposes an HTTP API on the machine it runs on, by default at
`http://<host>:8088/api/`:

- `GET /api/` with no parameters returns an XML status document (version,
  edition, every input's state, recording/streaming status).
- `GET /api/?Function=<Name>&Input=<id>&Value=<v>&SelectedName=<field>`
  triggers one of vMix's ~400 documented Functions — cuts, fades, taking an
  input to an overlay channel, setting a Graphics Title (GT) field's text,
  starting/stopping recording or streaming, and so on.

There's no persistent connection or auth token — every call is a
stateless HTTP GET. That shapes the design below: there's no "session" to
hold open, just a config (host/port) and a status check you can re-run any
time.

## The layer this sprint built

```
lib/vmix/
  types.ts         VMixConnectionState, VMixConfig, VMixCommand, and the
                    real vMix Function names this integration targets.
  client.ts         getVMixStatus() — a real, cached-per-request status
                     check. sendVMixCommand() — sends one real Function
                     call. Both read VMIX_HOST / VMIX_PORT from the
                     environment; both return "not_configured" (not an
                     error) when those aren't set, which is every
                     environment today.
  command-map.ts    VMIX_COMMAND_MAP — reference data mapping Broadcast
                     Center actions to the vMix Function each will call.
                     Every entry has wired: false right now (see below).

components/live/vmix-status.ts
                    Maps the client's VMixConnectionState onto the
                    Production Status panel's existing SystemState
                    vocabulary (connected / not_configured / offline),
                    so vMix reads the same way every other system chip
                    already does — no new visual language for it.
```

## What's real vs. planned

**Real, working, in production right now:**
- `getVMixStatus()` — called by `VMixEngine.getStatus()` only. Every UI/
  session file (`app/live/[matchId]/layout.tsx`, `page.tsx`,
  `readiness/page.tsx`, `formation/page.tsx`, `BroadcastSession.ts`) reads
  vMix's status through `BroadcastEngine.getSystemStatus("vmix")` instead
  — the Broadcast Integration Layer, not `lib/vmix/client` directly (see
  above; this used to be a direct import in all five places, found and
  fixed as a real architectural bypass, not a hypothetical one). If
  `VMIX_HOST` is unset (true today, everywhere), it returns
  `"not_configured"` instantly with no network call — zero cost for the
  common case. If it *is* set, it makes a real request with a 2.5s
  timeout and reports `"connected"` (with the real version string parsed
  from vMix's XML response) or `"error"` truthfully.
- The Mission Control strip and Production Status panel now show vMix's
  *real* state instead of a hardcoded placeholder.
- A misconfigured vMix (host set, unreachable) surfaces as a genuine Live
  Alert — an operator finds out before kickoff, not mid-match.

**Designed, not yet called from any UI action:**
- `sendVMixCommand()` exists and is real (it will actually attempt the
  HTTP call), but no Broadcast Center action currently calls it. Wiring a
  Quick Control button to it is the next piece of work after the first
  real connection milestone below — see `command-map.ts` for the intended
  mapping, and `wired: false` on every entry there marks that honestly.

## Command mapping (`lib/vmix/command-map.ts`)

| GGSP action | vMix Function | Notes |
|---|---|---|
| Goal scored | `SetText` | Push new score onto the scoreboard GT title. |
| Manual score edit | `SetText` | Same path, no timeline event attached. |
| Yellow card | `OverlayInput1In` | Lower-third graphic, name set via `SetText` first. |
| Red card | `OverlayInput1In` | Same channel as yellow — one card graphic live at a time. |
| Substitution | `OverlayInput2In` | Separate overlay channel so it can coexist with a card graphic. |
| Match status change | `SetText` | Status/clock title (e.g. "FIRST HALF"). |
| Broadcast Graphics → Take | `OverlayInput1In` | Generic per-category graphic. |
| Broadcast Graphics → Hide | `OverlayInput1Out` | Matches whichever channel Take used. |
| Program → Cut | `Cut` | No UI control exists for this yet. |
| Program → Fade | `Fade` | Same caveat. |
| Starting XI graphic | `SetText` × 11 (+ `OverlayInput1In`) | Not implemented. See "Tactical Formation export" below. |

## Tactical Formation export (architecture only — not implemented)

`supabase/migrations/007_tactical_formations.sql` stores everything a
Starting XI graphic needs: for each player on the pitch, `player_id`,
`tactical_position`, `x_coordinate`/`y_coordinate`, `shirt_number`,
`captain`, `goalkeeper`, grouped under one `tactical_formations` row per
(match, team). That's the complete data contract a future export needs —
no additional schema work required before wiring it.

What's deliberately not built: a `BroadcastCommand` kind for "push this
formation to vMix," and the `VMixEngine` translation for it. Saving a
formation (`app/live/[matchId]/formation/actions.ts`) does not call
`ScoreEngine`/`EventEngine`/`GraphicsEngine`/`AutomationPipeline` today —
preparing a lineup pre-kickoff isn't a live match event in the sense Goal/
Card/Substitution are, and routing it through the same pipeline before
there's a real Starting XI graphic template to target would be
architecture for its own sake. When that graphic template exists, the
real work is: add a `formation.publish` command kind to
`lib/broadcast/types.ts`, translate it in `VMixEngine.ts` (likely a
sequence of `SetText` calls, one per pitch slot, against a Starting XI GT
template, followed by `OverlayInput1In`), and call it from
`saveFormation()` the same way `addGoalEvent` calls `ScoreEngine`/
`EventEngine` today. No new architecture — the same frozen shape, one more
command kind.

## Next milestone

**GGSP sends one real command to a real vMix instance.** Concretely: someone
sets `VMIX_HOST` against a real running vMix, the Production Status panel
shows `Connected` with a real version string, and one Quick Control button
(the goal button is the obvious first candidate — it already has a
well-defined score to push) calls `sendVMixCommand()` and it actually
lands in vMix. Everything in `command-map.ts` beyond that stays `wired:
false` until each one gets the same treatment individually — this
integration is meant to grow one verified command at a time, not flip from
"designed" to "everything works" in one step.
