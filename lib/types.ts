export type LineupStatus = "waiting" | "submitted" | "needs_correction";

export type AccessStatus = "invited" | "active" | "suspended" | "disabled" | "archived";

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
  invitation_id: string | null;
  created_at: string;
  updated_at: string;
}

export type InvitationStatus = "pending" | "accepted" | "expired" | "revoked" | "archived";

export interface Invitation {
  id: string;
  email: string;
  full_name: string | null;
  role_key: PlatformRole;
  competition_id: string | null;
  team_id: string | null;
  status: InvitationStatus;
  message: string | null;
  invited_by: string | null;
  invited_user_id: string | null;
  accepted_user_id: string | null;
  expires_at: string | null;
  created_at: string;
  updated_at: string;
}

export interface AuditLogEntry {
  id: string;
  actor_user_id: string | null;
  action: string;
  target_type: string;
  target_id: string | null;
  organization_id: string | null;
  metadata: Record<string, unknown>;
  created_at: string;
}

export interface RoleMetadata {
  role_key: PlatformRole;
  name: string;
  description: string | null;
  is_system: boolean;
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
  | "match_end"
  // Sprint 2 — Phase 4 (supabase/migrations/011_additional_time_event.sql).
  | "additional_time";

export type FoundationStatus = "active" | "archived";

export type CompetitionType =
  | "league"
  | "cup"
  | "knockout"
  | "round_robin"
  | "league_playoffs"
  | "group_knockout"
  | "friendly_tournament"
  | "custom";

export type CompetitionGender = "male" | "female" | "mixed" | "open";

export type StageType =
  | "regular_season"
  | "group_stage"
  | "knockout"
  | "quarterfinal"
  | "semifinal"
  | "third_place"
  | "final"
  | "custom";

export type VenueSurfaceType = "grass" | "artificial_turf" | "hybrid" | "other";

export interface Competition {
  id: string;
  name: string;
  created_at: string;
  // Sprint 2.0 — Competition Foundation (supabase/migrations/006_competition_foundation.sql).
  // Optional so pre-migration records / older code paths still type-check.
  organization_id?: string | null;
  short_name?: string | null;
  slug?: string | null;
  description?: string | null;
  logo_url?: string | null;
  competition_type?: CompetitionType | null;
  sport?: string;
  gender?: CompetitionGender | null;
  age_category?: string | null;
  timezone?: string | null;
  match_duration?: number;
  halftime_duration?: number;
  extra_time_enabled?: boolean;
  penalties_enabled?: boolean;
  points_win?: number;
  points_draw?: number;
  points_loss?: number;
  status?: FoundationStatus;
  updated_at?: string;
  // Sprint 3 Phase 2 — Match Squad Workflow (supabase/migrations/021_competition_squad_rules.sql).
  // Optional so pre-migration records still type-check. null/undefined means
  // "no cap" for match_squad_size/max_substitutions; max_bench always has a
  // real value (DB default 9, preserving today's hardcoded UI behavior).
  match_squad_size?: number | null;
  max_bench?: number;
  max_substitutions?: number | null;
}

export interface Organization {
  id: string;
  name: string;
  short_name: string | null;
  slug: string;
  description: string | null;
  logo_url: string | null;
  banner_url: string | null;
  primary_color: string | null;
  secondary_color: string | null;
  country: string | null;
  city: string | null;
  address: string | null;
  phone: string | null;
  email: string | null;
  website: string | null;
  timezone: string | null;
  currency: string | null;
  status: FoundationStatus;
  created_at: string;
  updated_at: string;
}

export interface Season {
  id: string;
  competition_id: string;
  name: string;
  year: number | null;
  registration_start: string | null;
  registration_end: string | null;
  season_start: string | null;
  season_end: string | null;
  status: FoundationStatus;
  created_at: string;
  updated_at: string;
}

export interface Division {
  id: string;
  season_id: string;
  name: string;
  abbreviation: string | null;
  display_order: number;
  status: FoundationStatus;
  created_at: string;
  updated_at: string;
}

export interface Stage {
  id: string;
  division_id: string;
  name: string;
  stage_type: StageType | null;
  display_order: number;
  status: FoundationStatus;
  created_at: string;
  updated_at: string;
}

export interface CompetitionGroup {
  id: string;
  stage_id: string;
  name: string;
  display_order: number;
  status: FoundationStatus;
  created_at: string;
  updated_at: string;
}

export interface Venue {
  id: string;
  organization_id: string | null;
  name: string;
  short_name: string | null;
  slug: string | null;
  address: string | null;
  city: string | null;
  country: string | null;
  gps_latitude: number | null;
  gps_longitude: number | null;
  capacity: number | null;
  surface_type: VenueSurfaceType | null;
  lighting: boolean;
  home_team_supported: boolean;
  google_maps_url: string | null;
  photo_url: string | null;
  status: FoundationStatus;
  created_at: string;
  updated_at: string;
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
  // Sprint 2 — Coach Experience (supabase/migrations/010_coach_photo.sql).
  // Optional so pre-migration records still type-check.
  coach_photo_url?: string | null;
}

export type PlayerPosition = "Goalkeeper" | "Defender" | "Midfielder" | "Forward";
export type PreferredFoot = "Left" | "Right" | "Both";
export type PlayerAvailabilityStatus = "available" | "doubtful" | "injured" | "suspended";

export interface Player {
  id: string;
  team_id: string;
  number: number;
  full_name: string;
  created_at: string;
  // Sprint 3 Phase 2 — Coach Team Roster Module (supabase/migrations/020_player_roster_fields.sql).
  // Optional so pre-migration records still type-check.
  position?: PlayerPosition | null;
  photo_url?: string | null;
  preferred_foot?: PreferredFoot | null;
  is_captain?: boolean;
  active?: boolean;
  availability_status?: PlayerAvailabilityStatus;
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
  // Sprint 2 — Competition Completion (supabase/migrations/008_competition_completion.sql).
  // All nullable — a match can be scheduled with as little as a competition,
  // or scoped all the way down to a specific group. Setting the most
  // specific one (e.g. group_id) auto-fills its ancestors via a database
  // trigger, so these are rarely all set by application code directly.
  season_id?: string | null;
  division_id?: string | null;
  stage_id?: string | null;
  group_id?: string | null;
  venue_id?: string | null;
  // Sprint 3 — Live Match Experience (supabase/migrations/014_match_officials.sql).
  // A match has one officiating crew, not reusable entities — plain nullable
  // columns, same pattern as referee_name above.
  assistant_referee_1_name?: string | null;
  assistant_referee_2_name?: string | null;
  fourth_official_name?: string | null;
  var_official_name?: string | null;
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

// Match Statistics Engine (supabase/migrations/015_match_statistics.sql).
// One row per (match, team), operator-driven — never inferred from
// match_events, even for Yellow/Red Cards (see the migration's own
// comment for why). expected_goals is architecture only: always null
// until a real calculation engine exists.
export interface MatchStatistics {
  id: string;
  match_id: string;
  team_id: string;
  possession_percent: number;
  shots: number;
  shots_on_target: number;
  corners: number;
  fouls: number;
  offside: number;
  yellow_cards: number;
  red_cards: number;
  saves: number;
  expected_goals: number | null;
  created_at: string;
  updated_at: string;
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

// Tactical Formation Panel (supabase/migrations/007_tactical_formations.sql).
// Broadcast Control Center only — never read from the Coach Portal, the
// public site, or any public API route.
export type FormationName = "4-4-2" | "4-3-3" | "3-5-2" | "3-4-3" | "4-2-3-1" | "4-1-4-1" | "5-3-2" | "5-4-1" | "4-5-1" | "custom";

export interface TacticalFormation {
  id: string;
  match_id: string;
  team_id: string;
  formation: FormationName;
  created_at: string;
  updated_at: string;
}

export interface TacticalPosition {
  id: string;
  tactical_formation_id: string;
  player_id: string;
  tactical_position: string;
  x_coordinate: number;
  y_coordinate: number;
  shirt_number: number;
  captain: boolean;
  goalkeeper: boolean;
  created_at: string;
  updated_at: string;
  // Sprint 2 — Formation Engine (supabase/migrations/009_formation_engine.sql).
  // Optional so pre-migration records still type-check. The stable slot
  // identity ("CB-1" vs "CB-2") — see lib/formation-engine.ts.
  slot_key?: string | null;
}
