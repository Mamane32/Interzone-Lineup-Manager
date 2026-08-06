import { describe, expect, it } from "vitest";
import { computeStandings, type StandingsInputMatch, type StandingsInputTeam } from "@/lib/standings";

const team = (id: string, name: string): StandingsInputTeam => ({ id, name, logoUrl: null });

const finished = (homeTeamId: string, awayTeamId: string, homeScore: number, awayScore: number): StandingsInputMatch => ({
  homeTeamId,
  awayTeamId,
  homeScore,
  awayScore,
  isFinished: true,
});

describe("computeStandings", () => {
  it("ranks by points, then goal difference, then goals for", () => {
    const teams = [team("a", "AS Beauchamp"), team("b", "Real Cassave FC")];
    const matches = [finished("a", "b", 1, 0)];

    const table = computeStandings(teams, matches);

    expect(table[0]).toMatchObject({ teamName: "AS Beauchamp", played: 1, won: 1, points: 3, goalDifference: 1 });
    expect(table[1]).toMatchObject({ teamName: "Real Cassave FC", played: 1, lost: 1, points: 0, goalDifference: -1 });
  });

  it("reproduces real Groupe C results (5th Edition, matchdays 3/6/9)", () => {
    // Interzone Nord'Ouest, 5th Edition — real results from matches 3, 6 and 9
    // of the official calendar (Beauchamp–Cassave, Gladiators–Resolutions,
    // Cassave–Billio).
    const teams = [
      team("beauchamp", "AS Beauchamp"),
      team("gladiators", "Gladiators FC"),
      team("resolutions", "FC Resolutions"),
      team("cassave", "Real Cassave FC"),
      team("billio", "Billio FC"),
    ];
    const matches = [
      finished("beauchamp", "cassave", 1, 0), // Match 3
      finished("gladiators", "resolutions", 0, 0), // Match 6
      finished("cassave", "billio", 3, 0), // Match 9
    ];

    const table = computeStandings(teams, matches);
    const byName = new Map(table.map((r) => [r.teamName, r]));

    expect(byName.get("AS Beauchamp")).toMatchObject({ played: 1, won: 1, drawn: 0, lost: 0, points: 3, goalDifference: 1 });
    expect(byName.get("Gladiators FC")).toMatchObject({ played: 1, won: 0, drawn: 1, lost: 0, points: 1, goalDifference: 0 });
    expect(byName.get("FC Resolutions")).toMatchObject({ played: 1, won: 0, drawn: 1, lost: 0, points: 1, goalDifference: 0 });
    expect(byName.get("Real Cassave FC")).toMatchObject({ played: 2, won: 1, drawn: 0, lost: 1, points: 3, goalsFor: 3, goalsAgainst: 1, goalDifference: 2 });
    expect(byName.get("Billio FC")).toMatchObject({ played: 1, won: 0, drawn: 0, lost: 1, points: 0, goalDifference: -3 });

    // A team with zero matches still appears in the table, at zero.
    const untouched = computeStandings([team("mikado", "Mikado FC")], []);
    expect(untouched[0]).toMatchObject({ played: 0, points: 0, goalDifference: 0 });
  });

  it("ignores unfinished matches entirely", () => {
    const teams = [team("a", "A"), team("b", "B")];
    const matches: StandingsInputMatch[] = [{ homeTeamId: "a", awayTeamId: "b", homeScore: 0, awayScore: 0, isFinished: false }];

    const table = computeStandings(teams, matches);
    expect(table.every((r) => r.played === 0)).toBe(true);
  });
});
