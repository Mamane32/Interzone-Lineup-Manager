import type { AccessStatus, InvitationStatus, PlatformRole, PlayerAvailabilityStatus, PlayerPosition, PreferredFoot } from "@/lib/types";

export const PLATFORM_ROLES: PlatformRole[] = [
  "super_admin",
  "admin",
  "competition_manager",
  "broadcast_operator",
  "coach",
  "referee",
  "media",
  "viewer",
];

export const ACCESS_STATUSES: AccessStatus[] = ["invited", "active", "suspended", "disabled", "archived"];

export const INVITATION_STATUSES: InvitationStatus[] = ["pending", "accepted", "expired", "revoked", "archived"];

export const PLAYER_POSITIONS: PlayerPosition[] = ["Goalkeeper", "Defender", "Midfielder", "Forward"];

export const PREFERRED_FEET: PreferredFoot[] = ["Left", "Right", "Both"];

export const PLAYER_AVAILABILITY_STATUSES: PlayerAvailabilityStatus[] = ["available", "doubtful", "injured", "suspended"];

/**
 * Availability values a coach may set directly (Sprint 3 Phase 2 Master
 * Plan §4.3b) — Available/Doubtful/Injured are normal, self-reported team
 * information. 'suspended' is a competition-imposed disciplinary fact and
 * is deliberately excluded here; only an admin/competition-manager action
 * may set or clear it (see app/admin/teams/[id]/actions.ts's
 * setPlayerSuspension).
 */
export const COACH_SETTABLE_AVAILABILITY_STATUSES: PlayerAvailabilityStatus[] = ["available", "doubtful", "injured"];

export function isPlatformRole(value: unknown): value is PlatformRole {
  return typeof value === "string" && (PLATFORM_ROLES as string[]).includes(value);
}

export function isAccessStatus(value: unknown): value is AccessStatus {
  return typeof value === "string" && (ACCESS_STATUSES as string[]).includes(value);
}

export function isInvitationStatus(value: unknown): value is InvitationStatus {
  return typeof value === "string" && (INVITATION_STATUSES as string[]).includes(value);
}

export function isPlayerPosition(value: unknown): value is PlayerPosition {
  return typeof value === "string" && (PLAYER_POSITIONS as string[]).includes(value);
}

export function isPreferredFoot(value: unknown): value is PreferredFoot {
  return typeof value === "string" && (PREFERRED_FEET as string[]).includes(value);
}

export function isPlayerAvailabilityStatus(value: unknown): value is PlayerAvailabilityStatus {
  return typeof value === "string" && (PLAYER_AVAILABILITY_STATUSES as string[]).includes(value);
}

/** Roles that make sense with a team assigned. Everything else must have team_id stripped to null server-side, regardless of what a form submitted. */
export const ROLES_ALLOWING_TEAM: PlatformRole[] = ["coach"];

/** Roles that make sense with a competition assigned (without necessarily requiring a team). */
export const ROLES_ALLOWING_COMPETITION: PlatformRole[] = ["coach", "competition_manager", "broadcast_operator"];

export const ROLES_REQUIRING_TEAM: PlatformRole[] = ["coach"];
