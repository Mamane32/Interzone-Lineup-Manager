import type { PublicGroup } from "@/lib/public-groups";

/**
 * Pure knockout-bracket resolution — no DB access, testable with fixtures.
 *
 * The 5th Edition's quarterfinal draw (from the official calendar) is fixed
 * ahead of time as *qualification slots*, not real fixtures: a slot like
 * "1e A" only becomes a real team once Group A's 10 matches are all
 * finished. The `matches` table can't hold a knockout fixture before both
 * legs are real teams (home_team_id/away_team_id are NOT NULL, distinct) —
 * so until a group is complete, a slot stays a placeholder here rather than
 * a fabricated row in the database. Once every group is complete this
 * resolves to real teams and an admin can create the actual match via the
 * existing Admin → Matches screen; lib/public-bracket.ts then prefers that
 * real row (with its live score) over this template.
 */

export type BracketSlotRef =
  | { kind: "group_position"; group: "A" | "B" | "C"; position: 1 | 2 | 3 }
  | { kind: "best_third"; rank: 1 | 2 };

export type QuarterfinalTemplate = {
  id: "QF1" | "QF2" | "QF3" | "QF4";
  label: string;
  home: BracketSlotRef;
  away: BracketSlotRef;
};

export const QUARTERFINAL_TEMPLATE: QuarterfinalTemplate[] = [
  { id: "QF1", label: "1e A vs 3e (G1)", home: { kind: "group_position", group: "A", position: 1 }, away: { kind: "best_third", rank: 1 } },
  { id: "QF2", label: "1e B vs 2e A (G2)", home: { kind: "group_position", group: "B", position: 1 }, away: { kind: "group_position", group: "A", position: 2 } },
  { id: "QF3", label: "1e C vs 3e (G3)", home: { kind: "group_position", group: "C", position: 1 }, away: { kind: "best_third", rank: 2 } },
  { id: "QF4", label: "2e B vs 2e C (G4)", home: { kind: "group_position", group: "B", position: 2 }, away: { kind: "group_position", group: "C", position: 3 } },
];

export type ResolvedSlot =
  | { resolved: true; teamId: string; teamName: string; logoUrl: string | null }
  | { resolved: false; label: string };

const POSITION_LABEL: Record<1 | 2 | 3, string> = { 1: "1e", 2: "2e", 3: "3e" };

function isGroupComplete(group: PublicGroup | undefined, expectedTeams: number): boolean {
  if (!group) return false;
  if (group.standings.length < expectedTeams) return false;
  // Round robin of N teams = N-1 matches per team, all finished.
  return group.standings.every((s) => s.played === expectedTeams - 1);
}

export function resolveSlot(
  ref: BracketSlotRef,
  groupsByLetter: Record<"A" | "B" | "C", PublicGroup | undefined>,
  expectedTeamsPerGroup = 5
): ResolvedSlot {
  if (ref.kind === "group_position") {
    const group = groupsByLetter[ref.group];
    if (!isGroupComplete(group, expectedTeamsPerGroup)) {
      return { resolved: false, label: `${POSITION_LABEL[ref.position]} Gwoup ${ref.group}` };
    }
    const row = group!.standings[ref.position - 1];
    return { resolved: true, teamId: row.teamId, teamName: row.teamName, logoUrl: row.logoUrl };
  }

  // best_third — only resolvable once every group is complete (a 3rd place
  // in an unfinished group isn't final, so it can't be ranked yet either).
  const allComplete = (["A", "B", "C"] as const).every((g) => isGroupComplete(groupsByLetter[g], expectedTeamsPerGroup));
  if (!allComplete) return { resolved: false, label: `${ref.rank}e pi bon 3è plas` };

  const thirdPlaces = (["A", "B", "C"] as const)
    .map((g) => ({ group: g, row: groupsByLetter[g]!.standings[2] }))
    .sort(
      (a, b) =>
        b.row.points - a.row.points ||
        b.row.goalDifference - a.row.goalDifference ||
        b.row.goalsFor - a.row.goalsFor ||
        a.row.teamName.localeCompare(b.row.teamName)
    );

  const picked = thirdPlaces[ref.rank - 1].row;
  return { resolved: true, teamId: picked.teamId, teamName: picked.teamName, logoUrl: picked.logoUrl };
}

export function resolveQuarterfinals(groups: PublicGroup[]) {
  const groupsByLetter: Record<"A" | "B" | "C", PublicGroup | undefined> = {
    A: groups.find((g) => g.name.trim().toUpperCase().endsWith("A")),
    B: groups.find((g) => g.name.trim().toUpperCase().endsWith("B")),
    C: groups.find((g) => g.name.trim().toUpperCase().endsWith("C")),
  };

  return QUARTERFINAL_TEMPLATE.map((qf) => ({
    id: qf.id,
    label: qf.label,
    home: resolveSlot(qf.home, groupsByLetter),
    away: resolveSlot(qf.away, groupsByLetter),
  }));
}
