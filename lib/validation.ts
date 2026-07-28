import type { AccessStatus, InvitationStatus, PlatformRole } from "@/lib/types";

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

export const INVITATION_STATUSES: InvitationStatus[] = ["pending", "accepted", "expired", "revoked"];

export function isPlatformRole(value: unknown): value is PlatformRole {
  return typeof value === "string" && (PLATFORM_ROLES as string[]).includes(value);
}

export function isAccessStatus(value: unknown): value is AccessStatus {
  return typeof value === "string" && (ACCESS_STATUSES as string[]).includes(value);
}

export function isInvitationStatus(value: unknown): value is InvitationStatus {
  return typeof value === "string" && (INVITATION_STATUSES as string[]).includes(value);
}

/** Roles that make sense with a team assigned. Everything else must have team_id stripped to null server-side, regardless of what a form submitted. */
export const ROLES_ALLOWING_TEAM: PlatformRole[] = ["coach"];

/** Roles that make sense with a competition assigned (without necessarily requiring a team). */
export const ROLES_ALLOWING_COMPETITION: PlatformRole[] = ["coach", "competition_manager", "broadcast_operator"];

export const ROLES_REQUIRING_TEAM: PlatformRole[] = ["coach"];
