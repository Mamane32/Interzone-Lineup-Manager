import "server-only";
import { redirect } from "next/navigation";
import { getSessionUser, getProfile, getActiveAssignments } from "@/lib/access";
import type { PlatformRole } from "@/lib/types";

/**
 * The White-Label Branding System's two-level permission model (see the
 * Sprint 3 brief). This module is the single place that decides who may
 * read or write which branding level — the Brand Studio UI, its Server
 * Actions, and lib/branding.ts's writers all defer to these functions
 * rather than re-deriving the rule inline.
 *
 *   Level 1 (platform_branding)      — super_admin: full access.
 *                                       admin: only if explicitly granted
 *                                       (user_access_assignments.can_manage_platform_branding).
 *                                       everyone else: read-only.
 *   Level 2 (competitions.* / competition_sponsor_logos) — super_admin:
 *                                       full access to every competition.
 *                                       competition_manager: access only to
 *                                       competitions they hold an active
 *                                       assignment for (competition_id on
 *                                       their own row — the same scoping
 *                                       lib/iam.ts's resolveAssignmentScope
 *                                       already enforces on write).
 *                                       everyone else: read-only.
 *
 * "Read-only" here means: may view the Brand Studio's live preview and the
 * currently-saved branding, may never submit a branding Server Action.
 * coach / broadcast_operator / media / referee / viewer all land here.
 */

export type BrandingRole = "platform-owner" | "competition-admin" | "viewer-only" | "none";

export interface BrandingAccessContext {
  userId: string;
  role: PlatformRole;
  brandingRole: BrandingRole;
  /** Competition ids this user may write Level 2 branding for. Empty unless brandingRole is "platform-owner" (implicitly all) or "competition-admin". */
  competitionIds: string[];
}

const READ_ONLY_ROLES: PlatformRole[] = ["coach", "broadcast_operator", "media", "referee", "viewer"];

/**
 * Resolves what the current session may do with branding, across both
 * levels, in one pass. Never trusts a client-submitted role or
 * competition id — everything here is re-derived from
 * user_access_assignments on every call, same posture as
 * lib/access.ts's requireRole.
 */
export async function getBrandingAccess(): Promise<BrandingAccessContext | null> {
  const user = await getSessionUser();
  if (!user) return null;

  const profile = await getProfile(user.id);
  if (!profile || profile.status !== "active") return null;

  const assignments = await getActiveAssignments(user.id);
  if (assignments.length === 0) return null;

  if (assignments.some((a) => a.role_key === "super_admin")) {
    return { userId: user.id, role: "super_admin", brandingRole: "platform-owner", competitionIds: [] };
  }

  const grantedAdmin = assignments.find(
    (a) => a.role_key === "admin" && (a as unknown as { can_manage_platform_branding?: boolean }).can_manage_platform_branding
  );
  if (grantedAdmin) {
    return { userId: user.id, role: "admin", brandingRole: "platform-owner", competitionIds: [] };
  }

  const competitionManagerAssignments = assignments.filter((a) => a.role_key === "competition_manager" && a.competition_id);
  if (competitionManagerAssignments.length > 0) {
    return {
      userId: user.id,
      role: "competition_manager",
      brandingRole: "competition-admin",
      competitionIds: competitionManagerAssignments.map((a) => a.competition_id as string),
    };
  }

  const readOnly = assignments.find((a) => READ_ONLY_ROLES.includes(a.role_key));
  if (readOnly) {
    return { userId: user.id, role: readOnly.role_key, brandingRole: "viewer-only", competitionIds: [] };
  }

  // Regular admin with no grant, or any other role not covered above:
  // can view branding (it affects UI they use) but never write it.
  return { userId: user.id, role: assignments[0].role_key, brandingRole: "viewer-only", competitionIds: [] };
}

/** Server Action / route gate for Level 1 (platform) writes. Redirects if there is no session; throws for an authenticated-but-unauthorized user so the Server Action fails loudly instead of silently no-op'ing. */
export async function requirePlatformBrandingWrite(): Promise<BrandingAccessContext> {
  const access = await getBrandingAccess();
  if (!access) redirect("/login");
  if (access.brandingRole !== "platform-owner") {
    throw new Error("You do not have permission to modify platform branding.");
  }
  return access;
}

/** Server Action / route gate for Level 2 (competition) writes, scoped to one competition id. Platform Owner may write any competition; a Competition Administrator may only write competitions in their own competitionIds. */
export async function requireCompetitionBrandingWrite(competitionId: string): Promise<BrandingAccessContext> {
  const access = await getBrandingAccess();
  if (!access) redirect("/login");
  if (access.brandingRole === "platform-owner") return access;
  if (access.brandingRole === "competition-admin" && access.competitionIds.includes(competitionId)) {
    return access;
  }
  throw new Error("You do not have permission to modify this competition's branding.");
}

/** True if the current session may at least view the Brand Studio (every active, assigned role can — enforcement is on writes). */
export async function canViewBrandStudio(): Promise<boolean> {
  const access = await getBrandingAccess();
  return access !== null;
}
