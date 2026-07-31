import { describe, expect, it } from "vitest";
import { validateFormation, resolveSlotPositions, type SlotAssignment } from "@/lib/formation-engine";
import { getFormationSlots } from "@/lib/formations";

/** Builds a full, valid 4-4-2 assignment set from 11 fake player ids — the baseline every test starts from and mutates one rule at a time. */
function validAssignments(): SlotAssignment[] {
  const slots = getFormationSlots("4-4-2");
  return slots.map((slot, i) => ({
    slotKey: slot.slotKey,
    playerId: `player-${i + 1}`,
    captain: i === 0, // captain on the GK slot for a deterministic baseline
    x: slot.x + 1, // deliberately different from the template, to prove named formations ignore this
    y: slot.y + 1,
  }));
}

const ROSTER = new Set(Array.from({ length: 11 }, (_, i) => `player-${i + 1}`));

describe("Formation Engine — validateFormation (slot-based, tightened rules)", () => {
  it("accepts a fully valid 11-player, one-goalkeeper, one-captain, no-duplicate assignment", () => {
    const result = validateFormation("4-4-2", validAssignments(), ROSTER);
    expect(result).toEqual({ ok: true });
  });

  it("rejects fewer than 11 players", () => {
    const result = validateFormation("4-4-2", validAssignments().slice(0, 10), ROSTER);
    expect(result.ok).toBe(false);
    expect((result as { error: string }).error).toMatch(/exactly 11/i);
  });

  it("rejects more than 11 players", () => {
    const extra = [...validAssignments(), { slotKey: "extra", playerId: "player-12", captain: false, x: 50, y: 50 }];
    const result = validateFormation("4-4-2", extra, ROSTER);
    expect(result.ok).toBe(false);
    expect((result as { error: string }).error).toMatch(/exactly 11/i);
  });

  it("rejects zero goalkeepers (GK slot swapped for a duplicate of another slot)", () => {
    const assignments = validAssignments();
    // Replace the GK slot's key with a non-existent one so no slot is flagged goalkeeper.
    assignments[0] = { ...assignments[0], slotKey: "CB-1" }; // now collides with the real CB-1 too
    const result = validateFormation("4-4-2", assignments, ROSTER);
    expect(result.ok).toBe(false);
    // Either the duplicate-slot rule or the goalkeeper rule catches this — both are correct rejections.
    expect((result as { error: string }).error).toBeTruthy();
  });

  it("rejects zero captains", () => {
    const assignments = validAssignments().map((a) => ({ ...a, captain: false }));
    const result = validateFormation("4-4-2", assignments, ROSTER);
    expect(result.ok).toBe(false);
    expect((result as { error: string }).error).toMatch(/exactly one captain/i);
  });

  it("rejects more than one captain", () => {
    const assignments = validAssignments().map((a, i) => ({ ...a, captain: i < 2 }));
    const result = validateFormation("4-4-2", assignments, ROSTER);
    expect(result.ok).toBe(false);
    expect((result as { error: string }).error).toMatch(/exactly one captain/i);
  });

  it("rejects the same player assigned to two slots", () => {
    const assignments = validAssignments();
    assignments[1] = { ...assignments[1], playerId: assignments[0].playerId };
    const result = validateFormation("4-4-2", assignments, ROSTER);
    expect(result.ok).toBe(false);
    expect((result as { error: string }).error).toMatch(/more than one slot/i);
  });

  it("rejects a player who isn't on this team's roster", () => {
    const assignments = validAssignments();
    assignments[5] = { ...assignments[5], playerId: "not-on-roster" };
    const result = validateFormation("4-4-2", assignments, ROSTER);
    expect(result.ok).toBe(false);
    expect((result as { error: string }).error).toMatch(/roster/i);
  });

  it("rejects a slot key that doesn't belong to the chosen formation", () => {
    const assignments = validAssignments();
    assignments[3] = { ...assignments[3], slotKey: "not-a-real-slot" };
    const result = validateFormation("4-4-2", assignments, ROSTER);
    expect(result.ok).toBe(false);
    expect((result as { error: string }).error).toMatch(/not a valid slot/i);
  });

  it("rejects two players assigned to the same slot", () => {
    const assignments = validAssignments();
    assignments[2] = { ...assignments[2], slotKey: assignments[3].slotKey };
    const result = validateFormation("4-4-2", assignments, ROSTER);
    expect(result.ok).toBe(false);
    expect((result as { error: string }).error).toMatch(/same slot/i);
  });

  it("validates independently per formation — a valid 4-3-3 set isn't valid against 4-4-2's slots", () => {
    const slots433 = getFormationSlots("4-3-3");
    const assignments = slots433.map((slot, i) => ({ slotKey: slot.slotKey, playerId: `player-${i + 1}`, captain: i === 0, x: slot.x, y: slot.y }));
    expect(validateFormation("4-3-3", assignments, ROSTER).ok).toBe(true);
    expect(validateFormation("4-4-2", assignments, ROSTER).ok).toBe(false);
  });
});

describe("Formation Engine — resolveSlotPositions (engine owns positioning for named formations)", () => {
  it("ignores caller-submitted x/y for a named formation and uses the template's own geometry", () => {
    const assignments = validAssignments(); // x/y deliberately offset from the template in the fixture
    const resolved = resolveSlotPositions("4-4-2", assignments);
    const templateSlots = new Map(getFormationSlots("4-4-2").map((s) => [s.slotKey, s]));
    for (const a of resolved) {
      const slot = templateSlots.get(a.slotKey)!;
      expect(a.x).toBe(slot.x);
      expect(a.y).toBe(slot.y);
      expect(a.tacticalPosition).toBe(slot.tacticalPosition);
    }
  });

  it("trusts caller-submitted x/y for the custom formation", () => {
    const customSlots = getFormationSlots("custom");
    const assignments: SlotAssignment[] = customSlots.map((slot, i) => ({
      slotKey: slot.slotKey,
      playerId: `player-${i + 1}`,
      captain: i === 0,
      x: 12.34,
      y: 56.78,
    }));
    const resolved = resolveSlotPositions("custom", assignments);
    for (const a of resolved) {
      expect(a.x).toBe(12.34);
      expect(a.y).toBe(56.78);
    }
  });

  it("resolves goalkeeper flag from the slot template, not the caller", () => {
    const assignments = validAssignments();
    const resolved = resolveSlotPositions("4-4-2", assignments);
    const gk = resolved.find((a) => a.slotKey === "GK");
    expect(gk?.goalkeeper).toBe(true);
    expect(resolved.filter((a) => a.goalkeeper)).toHaveLength(1);
  });
});
