import type { FormationName } from "@/lib/types";

/**
 * Formation templates — reference data, not a specific team's layout. Pure
 * coordinates (0-100 percent of pitch width/height) describing where each
 * of the 11 shirt slots sits for a given shape. Auto-placement reads this;
 * nothing about a real team, player, or match is hardcoded here — that's
 * exactly what "never hardcode layouts" means: the layout is data the UI
 * consumes, not markup baked into a component.
 *
 * y: 0 = defending goal line, 100 = attacking goal line.
 * x: 0 = left touchline, 100 = right touchline.
 * Slot order within each formation is GK first, then back-to-front,
 * left-to-right — this is also the order starting_xi players fill into.
 *
 * `slotKey` is the stable, unique-per-formation identity of a slot — the
 * Formation Engine's unit of truth (see lib/formation-engine.ts). Two
 * center-backs in a 4-4-2 share the human-readable `tacticalPosition`
 * label "CB" but have distinct slot keys ("CB-1"/"CB-2"), because the
 * engine needs to know WHICH back a player was assigned to, not just that
 * they're "a CB."
 */
export type FormationSlot = { slotKey: string; tacticalPosition: string; x: number; y: number; goalkeeper?: boolean };

/** A player placed on the pitch, live in the editor — the shared shape every visualization mode, the animation preview, the broadcast preview, and the preset system all read from. One shape, no duplication. */
export type PlacedPlayer = {
  slotKey: string;
  playerId: string;
  fullName: string;
  shirtNumber: number;
  tacticalPosition: string;
  x: number;
  y: number;
  captain: boolean;
  goalkeeper: boolean;
};

/** Assigns a stable slotKey to each slot in a template: the label plus a 1-based index among slots sharing that label ("CB" -> "CB-1", "CB-2"; a label that appears once keeps its own name, e.g. "GK"). */
function withSlotKeys(slots: Omit<FormationSlot, "slotKey">[]): FormationSlot[] {
  const seen = new Map<string, number>();
  const counts = new Map<string, number>();
  for (const s of slots) counts.set(s.tacticalPosition, (counts.get(s.tacticalPosition) ?? 0) + 1);

  return slots.map((s) => {
    const total = counts.get(s.tacticalPosition) ?? 1;
    if (total === 1) return { ...s, slotKey: s.tacticalPosition };
    const index = (seen.get(s.tacticalPosition) ?? 0) + 1;
    seen.set(s.tacticalPosition, index);
    return { ...s, slotKey: `${s.tacticalPosition}-${index}` };
  });
}

const RAW_FORMATION_LAYOUTS: Record<Exclude<FormationName, "custom">, Omit<FormationSlot, "slotKey">[]> = {
  "4-4-2": [
    { tacticalPosition: "GK", x: 50, y: 8, goalkeeper: true },
    { tacticalPosition: "LB", x: 15, y: 25 },
    { tacticalPosition: "CB", x: 38, y: 20 },
    { tacticalPosition: "CB", x: 62, y: 20 },
    { tacticalPosition: "RB", x: 85, y: 25 },
    { tacticalPosition: "LM", x: 15, y: 55 },
    { tacticalPosition: "CM", x: 38, y: 52 },
    { tacticalPosition: "CM", x: 62, y: 52 },
    { tacticalPosition: "RM", x: 85, y: 55 },
    { tacticalPosition: "ST", x: 38, y: 82 },
    { tacticalPosition: "ST", x: 62, y: 82 },
  ],
  "4-3-3": [
    { tacticalPosition: "GK", x: 50, y: 8, goalkeeper: true },
    { tacticalPosition: "LB", x: 15, y: 25 },
    { tacticalPosition: "CB", x: 38, y: 20 },
    { tacticalPosition: "CB", x: 62, y: 20 },
    { tacticalPosition: "RB", x: 85, y: 25 },
    { tacticalPosition: "CM", x: 30, y: 50 },
    { tacticalPosition: "CM", x: 50, y: 45 },
    { tacticalPosition: "CM", x: 70, y: 50 },
    { tacticalPosition: "LW", x: 20, y: 80 },
    { tacticalPosition: "ST", x: 50, y: 85 },
    { tacticalPosition: "RW", x: 80, y: 80 },
  ],
  "3-5-2": [
    { tacticalPosition: "GK", x: 50, y: 8, goalkeeper: true },
    { tacticalPosition: "CB", x: 30, y: 20 },
    { tacticalPosition: "CB", x: 50, y: 16 },
    { tacticalPosition: "CB", x: 70, y: 20 },
    { tacticalPosition: "LWB", x: 10, y: 50 },
    { tacticalPosition: "CM", x: 35, y: 48 },
    { tacticalPosition: "CM", x: 50, y: 44 },
    { tacticalPosition: "CM", x: 65, y: 48 },
    { tacticalPosition: "RWB", x: 90, y: 50 },
    { tacticalPosition: "ST", x: 38, y: 82 },
    { tacticalPosition: "ST", x: 62, y: 82 },
  ],
  "3-4-3": [
    { tacticalPosition: "GK", x: 50, y: 8, goalkeeper: true },
    { tacticalPosition: "CB", x: 30, y: 20 },
    { tacticalPosition: "CB", x: 50, y: 16 },
    { tacticalPosition: "CB", x: 70, y: 20 },
    { tacticalPosition: "LM", x: 15, y: 52 },
    { tacticalPosition: "CM", x: 38, y: 48 },
    { tacticalPosition: "CM", x: 62, y: 48 },
    { tacticalPosition: "RM", x: 85, y: 52 },
    { tacticalPosition: "LW", x: 20, y: 80 },
    { tacticalPosition: "ST", x: 50, y: 85 },
    { tacticalPosition: "RW", x: 80, y: 80 },
  ],
  "4-2-3-1": [
    { tacticalPosition: "GK", x: 50, y: 8, goalkeeper: true },
    { tacticalPosition: "LB", x: 15, y: 25 },
    { tacticalPosition: "CB", x: 38, y: 20 },
    { tacticalPosition: "CB", x: 62, y: 20 },
    { tacticalPosition: "RB", x: 85, y: 25 },
    { tacticalPosition: "CDM", x: 38, y: 40 },
    { tacticalPosition: "CDM", x: 62, y: 40 },
    { tacticalPosition: "LAM", x: 20, y: 62 },
    { tacticalPosition: "CAM", x: 50, y: 60 },
    { tacticalPosition: "RAM", x: 80, y: 62 },
    { tacticalPosition: "ST", x: 50, y: 85 },
  ],
  "4-1-4-1": [
    { tacticalPosition: "GK", x: 50, y: 8, goalkeeper: true },
    { tacticalPosition: "LB", x: 15, y: 25 },
    { tacticalPosition: "CB", x: 38, y: 20 },
    { tacticalPosition: "CB", x: 62, y: 20 },
    { tacticalPosition: "RB", x: 85, y: 25 },
    { tacticalPosition: "CDM", x: 50, y: 38 },
    { tacticalPosition: "LM", x: 15, y: 58 },
    { tacticalPosition: "CM", x: 38, y: 55 },
    { tacticalPosition: "CM", x: 62, y: 55 },
    { tacticalPosition: "RM", x: 85, y: 58 },
    { tacticalPosition: "ST", x: 50, y: 85 },
  ],
  "5-3-2": [
    { tacticalPosition: "GK", x: 50, y: 8, goalkeeper: true },
    { tacticalPosition: "LWB", x: 10, y: 28 },
    { tacticalPosition: "CB", x: 30, y: 20 },
    { tacticalPosition: "CB", x: 50, y: 16 },
    { tacticalPosition: "CB", x: 70, y: 20 },
    { tacticalPosition: "RWB", x: 90, y: 28 },
    { tacticalPosition: "CM", x: 30, y: 50 },
    { tacticalPosition: "CM", x: 50, y: 46 },
    { tacticalPosition: "CM", x: 70, y: 50 },
    { tacticalPosition: "ST", x: 38, y: 82 },
    { tacticalPosition: "ST", x: 62, y: 82 },
  ],
  "5-4-1": [
    { tacticalPosition: "GK", x: 50, y: 8, goalkeeper: true },
    { tacticalPosition: "LWB", x: 10, y: 28 },
    { tacticalPosition: "CB", x: 30, y: 20 },
    { tacticalPosition: "CB", x: 50, y: 16 },
    { tacticalPosition: "CB", x: 70, y: 20 },
    { tacticalPosition: "RWB", x: 90, y: 28 },
    { tacticalPosition: "LM", x: 15, y: 55 },
    { tacticalPosition: "CM", x: 38, y: 52 },
    { tacticalPosition: "CM", x: 62, y: 52 },
    { tacticalPosition: "RM", x: 85, y: 55 },
    { tacticalPosition: "ST", x: 50, y: 85 },
  ],
  "4-5-1": [
    { tacticalPosition: "GK", x: 50, y: 8, goalkeeper: true },
    { tacticalPosition: "LB", x: 15, y: 25 },
    { tacticalPosition: "CB", x: 38, y: 20 },
    { tacticalPosition: "CB", x: 62, y: 20 },
    { tacticalPosition: "RB", x: 85, y: 25 },
    { tacticalPosition: "LM", x: 10, y: 52 },
    { tacticalPosition: "CM", x: 30, y: 48 },
    { tacticalPosition: "CM", x: 50, y: 45 },
    { tacticalPosition: "CM", x: 70, y: 48 },
    { tacticalPosition: "RM", x: 90, y: 52 },
    { tacticalPosition: "ST", x: 50, y: 85 },
  ],
};

export const FORMATION_LAYOUTS: Record<Exclude<FormationName, "custom">, FormationSlot[]> = Object.fromEntries(
  Object.entries(RAW_FORMATION_LAYOUTS).map(([name, slots]) => [name, withSlotKeys(slots)])
) as Record<Exclude<FormationName, "custom">, FormationSlot[]>;

/** A generic, evenly-spread 11-slot starting point for "custom" — fully draggable from here, not a real formation shape. Each slot already has a unique label (P2..P11), so no numeric suffix is added. */
export const CUSTOM_FALLBACK_SLOTS: FormationSlot[] = withSlotKeys([
  { tacticalPosition: "GK", x: 50, y: 8, goalkeeper: true },
  { tacticalPosition: "P2", x: 15, y: 25 },
  { tacticalPosition: "P3", x: 38, y: 22 },
  { tacticalPosition: "P4", x: 62, y: 22 },
  { tacticalPosition: "P5", x: 85, y: 25 },
  { tacticalPosition: "P6", x: 15, y: 50 },
  { tacticalPosition: "P7", x: 38, y: 48 },
  { tacticalPosition: "P8", x: 62, y: 48 },
  { tacticalPosition: "P9", x: 85, y: 50 },
  { tacticalPosition: "P10", x: 38, y: 78 },
  { tacticalPosition: "P11", x: 62, y: 78 },
]);

export const FORMATION_OPTIONS: { value: FormationName; label: string }[] = [
  { value: "4-4-2", label: "4-4-2" },
  { value: "4-3-3", label: "4-3-3" },
  { value: "3-5-2", label: "3-5-2" },
  { value: "3-4-3", label: "3-4-3" },
  { value: "4-2-3-1", label: "4-2-3-1" },
  { value: "4-1-4-1", label: "4-1-4-1" },
  { value: "5-3-2", label: "5-3-2" },
  { value: "5-4-1", label: "5-4-1" },
  { value: "4-5-1", label: "4-5-1" },
  { value: "custom", label: "Custom Formation" },
];

export function getFormationSlots(formation: FormationName): FormationSlot[] {
  if (formation === "custom") return CUSTOM_FALLBACK_SLOTS;
  return FORMATION_LAYOUTS[formation];
}
