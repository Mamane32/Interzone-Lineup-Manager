import { getFormationSlots, type PlacedPlayer } from "@/lib/formations";
import type { FormationName, Player, TacticalFormation, TacticalPosition } from "@/lib/types";

/**
 * The Formation Engine's core unit: a player assigned to a specific slot.
 * Deliberately minimal — only what a caller can legitimately claim about
 * their own submission. `tacticalPosition`, `goalkeeper`, and shirt number
 * are NOT here because they are properties of the slot/roster, not of the
 * assignment; the engine derives them itself (see resolveSlotPositions and
 * lib/tactical-formation.ts's saveFormationCore) rather than trusting a
 * caller to report them accurately.
 */
export type SlotAssignment = {
  slotKey: string;
  playerId: string;
  captain: boolean;
  /** Only honored for the "custom" formation — see resolveSlotPositions. */
  x: number;
  y: number;
};

export type FormationValidationResult = { ok: true } | { ok: false; error: string };

/**
 * The one authority on "is this a valid, saveable formation" — identical
 * rules regardless of which role is saving (Coach, Admin; Broadcast never
 * calls this, it's read-only). Five rules, all required:
 *
 *  1. exactly 11 players
 *  2. exactly one goalkeeper (the slot flagged `goalkeeper` in the
 *     formation template must be filled)
 *  3. exactly one captain
 *  4. no duplicate players
 *  5. a valid formation layout — every assignment maps to a real slot in
 *     the chosen formation, no two assignments share a slot, and every
 *     slot the formation defines is filled (not just any 11 slot keys)
 */
export function validateFormation(
  formation: FormationName,
  assignments: SlotAssignment[],
  rosterPlayerIds: ReadonlySet<string>
): FormationValidationResult {
  if (assignments.length !== 11) {
    return { ok: false, error: `A formation requires exactly 11 players on the pitch — got ${assignments.length}.` };
  }

  const playerIds = assignments.map((a) => a.playerId);
  if (new Set(playerIds).size !== playerIds.length) {
    return { ok: false, error: "The same player is assigned to more than one slot." };
  }

  for (const id of playerIds) {
    if (!rosterPlayerIds.has(id)) {
      return { ok: false, error: "A placed player is not part of this team's roster." };
    }
  }

  const slots = getFormationSlots(formation);
  const validSlotKeys = new Set(slots.map((s) => s.slotKey));
  const goalkeeperSlotKeys = new Set(slots.filter((s) => s.goalkeeper).map((s) => s.slotKey));

  const assignedSlotKeys = assignments.map((a) => a.slotKey);
  if (new Set(assignedSlotKeys).size !== assignedSlotKeys.length) {
    return { ok: false, error: "Two players are assigned to the same slot." };
  }
  for (const key of assignedSlotKeys) {
    if (!validSlotKeys.has(key)) {
      return { ok: false, error: `"${key}" is not a valid slot for the ${formation} formation.` };
    }
  }
  if (assignedSlotKeys.length !== validSlotKeys.size) {
    return { ok: false, error: "Not every slot in this formation has a player assigned." };
  }

  const goalkeeperCount = assignments.filter((a) => goalkeeperSlotKeys.has(a.slotKey)).length;
  if (goalkeeperCount !== 1) {
    return { ok: false, error: `Exactly one goalkeeper is required — got ${goalkeeperCount}.` };
  }

  const captainCount = assignments.filter((a) => a.captain).length;
  if (captainCount !== 1) {
    return { ok: false, error: `Exactly one captain is required — got ${captainCount}.` };
  }

  return { ok: true };
}

/** A slot assignment with its slot-derived properties resolved — what actually gets persisted. */
export type ResolvedSlotAssignment = SlotAssignment & { tacticalPosition: string; goalkeeper: boolean };

/**
 * Resolves the authoritative x/y (and tacticalPosition/goalkeeper) for
 * each assignment. Named formations always use the engine's own template
 * geometry — a caller cannot claim "CB-1" sits somewhere other than where
 * the 4-4-2 template says it does. Only "custom" trusts the coordinates
 * supplied by the caller, since free positioning is the entire point of
 * that formation. Assumes `assignments` already passed validateFormation
 * (every slotKey is guaranteed to exist in the template).
 */
export function resolveSlotPositions(formation: FormationName, assignments: SlotAssignment[]): ResolvedSlotAssignment[] {
  const slotsByKey = new Map(getFormationSlots(formation).map((s) => [s.slotKey, s]));
  const isCustom = formation === "custom";

  return assignments.map((a) => {
    const slot = slotsByKey.get(a.slotKey)!;
    return {
      ...a,
      x: isCustom ? a.x : slot.x,
      y: isCustom ? a.y : slot.y,
      tacticalPosition: slot.tacticalPosition,
      goalkeeper: Boolean(slot.goalkeeper),
    };
  });
}

/**
 * Builds the initial view-model any Formation Engine consumer (Coach,
 * Admin, Broadcast) starts editing from: a previously saved formation if
 * one exists, else auto-placed from the team's submitted Starting XI,
 * else empty (nothing to place yet). Client-safe (no "server-only", no
 * DB) — this is presentation setup, not a persistence concern, so it
 * lives in the engine rather than being reimplemented per shell.
 */
export function buildInitialPositions(
  team: {
    players: Player[];
    startingXi: string[];
    captainId: string | null;
    saved: { formation: TacticalFormation | null; positions: TacticalPosition[] };
  },
  formation: FormationName
): PlacedPlayer[] {
  const byId = new Map(team.players.map((p) => [p.id, p]));

  if (team.saved.formation && team.saved.positions.length > 0) {
    return team.saved.positions
      .map((pos) => {
        const player = byId.get(pos.player_id);
        if (!player) return null;
        return {
          // Rows saved before the Formation Engine (migration 009) have no
          // slot_key yet — falling back to the label is harmless (it just
          // won't disambiguate two same-labeled slots until the next save
          // re-keys it properly).
          slotKey: pos.slot_key ?? pos.tactical_position,
          playerId: player.id,
          fullName: player.full_name,
          shirtNumber: pos.shirt_number,
          tacticalPosition: pos.tactical_position,
          x: Number(pos.x_coordinate),
          y: Number(pos.y_coordinate),
          captain: pos.captain,
          goalkeeper: pos.goalkeeper,
        } satisfies PlacedPlayer;
      })
      .filter((p): p is PlacedPlayer => p !== null);
  }

  if (team.startingXi.length !== 11) return [];

  const slots = getFormationSlots(formation);
  return team.startingXi.map((playerId, i) => {
    const player = byId.get(playerId);
    const slot = slots[i] ?? slots[slots.length - 1];
    return {
      slotKey: slot.slotKey,
      playerId,
      fullName: player?.full_name ?? "Unknown player",
      shirtNumber: player?.number ?? 0,
      tacticalPosition: slot.tacticalPosition,
      x: slot.x,
      y: slot.y,
      captain: playerId === team.captainId,
      goalkeeper: Boolean(slot.goalkeeper),
    } satisfies PlacedPlayer;
  });
}
