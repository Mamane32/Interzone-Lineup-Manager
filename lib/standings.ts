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
  /** "YYYY-MM-DD" — only needed for the Form Guide's chronological ordering. A match with no date is still counted in every points/goal-difference total, just left out of `form` (there's no reliable position to place it in the sequence). */
  matchDate?: string;
};

export type MatchResult = "W" | "D" | "L";

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
  /** Oldest first, most recent last, capped at the team's 5 most recent finished+dated matches. */
  form: MatchResult[];
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
      form: [],
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

  // Form Guide — chronological (oldest first), so it's built as a
  // separate pass over date-sorted matches rather than inline above
  // (the main loop doesn't assume `matches` arrives in any particular
  // order, and shouldn't have to just to support this).
  const datedFinished = matches
    .filter((m): m is StandingsInputMatch & { matchDate: string } => m.isFinished && typeof m.matchDate === "string")
    .sort((a, b) => a.matchDate.localeCompare(b.matchDate));
  for (const m of datedFinished) {
    const home = rows.get(m.homeTeamId);
    const away = rows.get(m.awayTeamId);
    if (!home || !away) continue;
    if (m.homeScore > m.awayScore) {
      home.form.push("W");
      away.form.push("L");
    } else if (m.homeScore < m.awayScore) {
      home.form.push("L");
      away.form.push("W");
    } else {
      home.form.push("D");
      away.form.push("D");
    }
  }
  for (const r of rows.values()) {
    r.form = r.form.slice(-5);
  }

  return [...rows.values()].sort(
    (a, b) =>
      b.points - a.points ||
      b.goalDifference - a.goalDifference ||
      b.goalsFor - a.goalsFor ||
      a.teamName.localeCompare(b.teamName)
  );
}
