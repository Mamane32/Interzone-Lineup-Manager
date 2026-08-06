import { describe, expect, it } from "vitest";
import { resolveQuarterfinals } from "@/lib/bracket";
import { computeStandings } from "@/lib/standings";
import type { PublicGroup } from "@/lib/public-groups";

function team(id: string, name: string) {
  return { id, name, logoUrl: null as string | null };
}

function playedMatch(homeTeamId: string, awayTeamId: string, homeScore: number, awayScore: number) {
  return { homeTeamId, awayTeamId, homeScore, awayScore, isFinished: true };
}

/** Round-robin of 5 teams = 10 fixtures; this generator plays every fixture
 * with a deterministic, rankable score so a group can be marked "complete"
 * in a test without hand-writing ten match literals per group. */
function completeRoundRobin(teamIds: string[]) {
  const matches = [];
  for (let i = 0; i < teamIds.length; i++) {
    for (let j = i + 1; j < teamIds.length; j++) {
      // Lower index always "wins" 1-0 — gives a clean, predictable table order.
      matches.push(playedMatch(teamIds[i], teamIds[j], 1, 0));
    }
  }
  return matches;
}

function buildGroup(name: string, teamNames: string[]): PublicGroup {
  const teams = teamNames.map((n, i) => team(`${name}-${i}`, n));
  const matches = completeRoundRobin(teams.map((t) => t.id));
  return { groupId: `group-${name}`, name: `Gwoup ${name}`, competitionName: "Interzone", standings: computeStandings(teams, matches) };
}

describe("resolveQuarterfinals", () => {
  it("leaves every slot as a placeholder when no group is complete", () => {
    const groups: PublicGroup[] = [
      { groupId: "a", name: "Gwoup A", competitionName: null, standings: computeStandings([team("a1", "Kriminal FC")], []) },
      { groupId: "b", name: "Gwoup B", competitionName: null, standings: computeStandings([team("b1", "Jean Rabel FC")], []) },
      { groupId: "c", name: "Gwoup C", competitionName: null, standings: computeStandings([team("c1", "Real Cassave FC")], []) },
    ];

    const qfs = resolveQuarterfinals(groups);
    expect(qfs.every((qf) => qf.home.resolved === false && qf.away.resolved === false)).toBe(true);
    expect(qfs.find((qf) => qf.id === "QF1")?.home).toMatchObject({ label: "1e Gwoup A" });
  });

  it("resolves group-position slots as soon as that specific group finishes, independent of the others", () => {
    const groupA = buildGroup("A", ["Kriminal FC", "Desmelus FC", "La Tortue FC", "Desroulins FC", "Legends FC"]);
    const groupBIncomplete: PublicGroup = { groupId: "b", name: "Gwoup B", competitionName: null, standings: computeStandings([team("b1", "Jean Rabel FC")], []) };
    const groupCIncomplete: PublicGroup = { groupId: "c", name: "Gwoup C", competitionName: null, standings: computeStandings([team("c1", "Real Cassave FC")], []) };

    const qfs = resolveQuarterfinals([groupA, groupBIncomplete, groupCIncomplete]);

    // QF1.home = 1st of Group A, which just finished — resolves to the team
    // that beat everyone in the deterministic fixture generator (index 0).
    expect(qfs.find((qf) => qf.id === "QF1")?.home).toMatchObject({ resolved: true, teamName: "Kriminal FC" });
    // QF1.away = best 3rd place across all three groups — B and C aren't done, stays a placeholder.
    expect(qfs.find((qf) => qf.id === "QF1")?.away).toMatchObject({ resolved: false });
    // QF2.home = 1st of Group B — Group B isn't complete, stays a placeholder.
    expect(qfs.find((qf) => qf.id === "QF2")?.home).toMatchObject({ resolved: false, label: "1e Gwoup B" });
  });

  it("resolves best_third only once all three groups are complete, ranked by points/GD/GF", () => {
    const groupA = buildGroup("A", ["Kriminal FC", "Desmelus FC", "La Tortue FC", "Desroulins FC", "Legends FC"]);
    const groupB = buildGroup("B", ["Jean Rabel FC", "Dimanche Matin FC", "Inazuma SC", "Mikado FC", "La Pointe FC"]);
    const groupC = buildGroup("C", ["Real Cassave FC", "Beauchamp FC", "Billio FC", "Gladiators FC", "Resolution FC"]);

    const qfs = resolveQuarterfinals([groupA, groupB, groupC]);

    // Every group's index-2 team ends up with the same record (2W/2L,
    // GD 0, GF 2) under this deterministic generator, so all three 3rd
    // places are tied on points/GD/GF and the name tiebreak decides:
    // "Billio FC" (Group C) < "Inazuma SC" (Group B) < "La Tortue FC" (Group A).
    expect(qfs.find((qf) => qf.id === "QF1")?.away).toMatchObject({ resolved: true, teamName: "Billio FC" });
    expect(qfs.find((qf) => qf.id === "QF3")?.away).toMatchObject({ resolved: true, teamName: "Inazuma SC" });
    expect(qfs.every((qf) => qf.home.resolved && qf.away.resolved)).toBe(true);
  });
});
