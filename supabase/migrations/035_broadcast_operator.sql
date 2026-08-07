-- ============================================================================
-- Broadcast Integration Layer — Active Operator (GGSP is the Engine, not
-- an operator itself; the Operator is a runtime-selectable role)
-- ============================================================================
-- Additive only. Nothing existing is altered, renamed, or dropped.
--
-- Per the approved architecture: GGSP is always the Engine (source of
-- truth for match state, the thing that updates the public site,
-- statistics, standings). The Operator — who/what is actually entering
-- events (goals, cards, subs) and rendering graphics for a given match —
-- is a separate, per-match, runtime-selectable role:
--   'ggsp' — Standalone. GGSP's own Broadcast Control Center UI is the
--            operator; GGSP renders its own graphics (app/broadcast-output).
--   'vmix' — Broadcast Mode. A human operates inside vMix directly; vMix
--            is the authoritative source for match events (via a future
--            Broadcast Bridge — see lib/broadcast/BroadcastBridge.ts).
--            GGSP does not render its own graphics in this mode.
--   'obs'  — Reserved for a future OBS provider. Not yet a real
--            integration on either the outbound (BroadcastSystemEngine)
--            or inbound (BroadcastBridgeProvider) side — selectable here
--            so the schema doesn't need a second migration once OBS
--            support lands, but the UI should not offer it as usable yet.
--
-- Defaults every existing and new match to 'ggsp' — the exact behavior
-- every match has today (GGSP's Broadcast Control Center is the only
-- operator surface that has ever existed), so this migration changes no
-- existing match's actual behavior on its own.

alter table matches
  add column if not exists broadcast_operator text not null default 'ggsp';

-- Postgres has no "add constraint if not exists" — drop-then-add is the
-- idempotent pattern already used throughout this project's migrations
-- (see 023_platform_branding_expansion.sql).
alter table matches drop constraint if exists matches_broadcast_operator_check;
alter table matches add constraint matches_broadcast_operator_check
  check (broadcast_operator in ('ggsp', 'vmix', 'obs'));
