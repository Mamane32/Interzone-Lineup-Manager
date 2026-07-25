export type LineupStatus = "waiting" | "submitted" | "needs_correction";

export interface Competition {
  id: string;
  name: string;
  created_at: string;
}

export interface Team {
  id: string;
  competition_id: string | null;
  name: string;
  logo_url: string | null;
  coach_name: string;
  coach_phone: string;
  coach_email: string | null;
  token: string;
  created_at: string;
}

export interface Player {
  id: string;
  team_id: string;
  number: number;
  full_name: string;
  created_at: string;
}

export interface Match {
  id: string;
  competition_id: string | null;
  round: string | null;
  home_team_id: string;
  away_team_id: string;
  match_date: string;
  match_time: string;
  created_at: string;
}

export interface Lineup {
  id: string;
  match_id: string;
  team_id: string;
  status: LineupStatus;
  starting_xi: string[];
  substitutes: string[];
  captain_id: string | null;
  remarks: string | null;
  locked: boolean;
  submitted_at: string | null;
  updated_at: string;
}

export interface MatchWithTeams extends Match {
  home_team: Team;
  away_team: Team;
  competition: Competition | null;
}

export interface LineupWithRelations extends Lineup {
  team: Team;
  match: MatchWithTeams;
  players: Player[];
}
