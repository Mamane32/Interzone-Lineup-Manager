-- ============================================================================
-- SPRINT 2 — FORMATION ENGINE (slot-based model)
-- ============================================================================
-- Additive only. Run AFTER 008_competition_completion.sql. Nothing existing
-- is altered, renamed, or dropped.
--
-- Prior to this migration, `tactical_positions` modeled "a player placed at
-- a position" as one atomic row — `tactical_position` (text, e.g. "CB") is
-- a human-readable label, but formations legitimately repeat labels (a
-- 4-4-2 has two "CB" rows and two "ST" rows), so it was never a real slot
-- identifier. The Formation Engine (lib/formation-engine.ts) now treats the
-- SLOT (a specific, uniquely-keyed position in a formation template — "CB-1"
-- vs "CB-2") as the stable unit, with a player as something assigned to it.
--
-- `slot_key` is that stable identifier, unique per formation instance.
-- Nullable: existing rows (there are none in production as of this
-- migration, but the column follows the same safe-by-default convention as
-- every other additive column in this project) simply have no slot_key
-- until the next save, which always populates it.

alter table tactical_positions
  add column if not exists slot_key text;

-- A slot can only be occupied by one player at a time within a given
-- formation instance. Partial (where slot_key is not null) so it has no
-- effect on any pre-existing row that predates this column.
create unique index if not exists tactical_positions_formation_slot_idx
  on tactical_positions (tactical_formation_id, slot_key)
  where slot_key is not null;

-- No RLS changes needed — `tactical_positions` already has RLS enabled
-- with no public policies; this is just one new nullable column.
