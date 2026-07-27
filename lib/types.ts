export type LineupStatus = "waiting" | "submitted" | "needs_correction";

export type AccessStatus = "invited" | "active" | "suspended" | "disabled";

export type PlatformRole =
  | "super_admin"
  | "admin"
  | "competition_manager"
  | "broadcast_operator"
  | "coach"
  | "referee"
  | "media"
  | "viewer";

export interface Profile {
  id: string;
  email: string;
  full_name: string | null;
  avatar_url: string | null;
  status: AccessStatus;
  created_at: string;
  updated_at: string;
}

export interface UserAccessAssignment {
  id: string;
  user_id: string;
  role_key: PlatformRole;
  competition_id: string | null;
  team_id: string | null;
  status: AccessStatus;
  created_at: string;
  updated_at: string;
}

export type MatchLiveStatus =
  | "pre_match"
  | "kickoff"
  | "first_half"
  | "half_time"
  | "second_half"
  | "extra_time"
  | "penalty_shootout"
  | "full_time";

export type MatchEventType =
  | "goal"
  | "penalty_goal"
  | "own_goal"
  | "yellow_card"
  | "second_yellow"
  | "red_card"
  | "substitution"
  | "var"
  | "penalty_missed"
  | "injury"
  | "match_start"
  | "half_time"
  | "match_resume"
  | "match_end";

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
  // Sprint 2 — Live Center (supabase/migrations/002_live_center.sql).
  // Optional so older records / pre-migration environments still type-check.
  live_status?: MatchLiveStatus;
  home_score?: number;
  away_score?: number;
  referee_name?: string | null;
  venue?: string | null;
}

export interface MatchEvent {
  id: string;
  match_id: string;
  minute: string;
  type: MatchEventType;
  team_id: string | null;
  player_id: string | null;
  description: string | null;
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
