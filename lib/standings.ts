/**
 * Pure group-stage standings calculation — no DB access, so it's testable
 * with fixtures and reusable from any read model (public groups page,
 * admin groups page, future exports). Only matches with a final score
 * (`isFinished`) count; scheduled-but-unplayed fixtures contribute a team
 * to the table (so every group member appears, even at 0 played) without
 * affecting points/goal difference.
 */

export type StandingsInputTeam = { id: string; name: string; logoUrl: string | null };

export type StandingsInputMatch = {
  homeTeamId: string;
  awayTeamId: string;
  homeScore: number;
  awayScore: number;
  isFinished: boolean;
};

export type StandingRow = {
  teamId: string;
  teamName: string;
  logoUrl: string | null;
  played: number;
  won: number;
  drawn: number;
  lost: number;
  goalsFor: number;
  goalsAgainst: number;
  goalDifference: number;
  points: number;
};

export type StandingsPoints = { win: number; draw: number; loss: number };

const DEFAULT_POINTS: StandingsPoints = { win: 3, draw: 1, loss: 0 };

export function computeStandings(
  teams: StandingsInputTeam[],
  matches: StandingsInputMatch[],
  points: StandingsPoints = DEFAULT_POINTS
): StandingRow[] {
  const rows = new Map<string, StandingRow>();
  for (const t of teams) {
    rows.set(t.id, {
      teamId: t.id,
      teamName: t.name,
      logoUrl: t.logoUrl,
      played: 0,
      won: 0,
      drawn: 0,
      lost: 0,
      goalsFor: 0,
      goalsAgainst: 0,
      goalDifference: 0,
      points: 0,
    });
  }

  for (const m of matches) {
    if (!m.isFinished) continue;
    const home = rows.get(m.homeTeamId);
    const away = rows.get(m.awayTeamId);
    if (!home || !away) continue;

    home.played += 1;
    away.played += 1;
    home.goalsFor += m.homeScore;
    home.goalsAgainst += m.awayScore;
    away.goalsFor += m.awayScore;
    away.goalsAgainst += m.homeScore;

    if (m.homeScore > m.awayScore) {
      home.won += 1;
      home.points += points.win;
      away.lost += 1;
      away.points += points.loss;
    } else if (m.homeScore < m.awayScore) {
      away.won += 1;
      away.points += points.win;
      home.lost += 1;
      home.points += points.loss;
    } else {
      home.drawn += 1;
      away.drawn += 1;
      home.points += points.draw;
      away.points += points.draw;
    }
  }

  for (const r of rows.values()) {
    r.goalDifference = r.goalsFor - r.goalsAgainst;
  }

  return [...rows.values()].sort(
    (a, b) =>
      b.points - a.points ||
      b.goalDifference - a.goalDifference ||
      b.goalsFor - a.goalsFor ||
      a.teamName.localeCompare(b.teamName)
  );
}
