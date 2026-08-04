import "server-only";
import { cache } from "react";
import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { supabaseAdmin } from "@/lib/supabase-admin";
import type { PlatformRole, Profile, UserAccessAssignment } from "@/lib/types";

// Static destination for roles that don't need per-assignment scope lookup.
const ROLE_DESTINATION: Partial<Record<PlatformRole, string>> = {
  super_admin: "/admin/dashboard",
  admin: "/admin/dashboard",
  broadcast_operator: "/live",
  competition_manager: "/competition",
  referee: "/referee",
  media: "/media",
  viewer: "/viewer",
};

const ROLE_LABEL: Record<PlatformRole, string> = {
  super_admin: "Administrator",
  admin: "Administrator",
  competition_manager: "Competition Manager",
  broadcast_operator: "Broadcast Operator",
  coach: "Coach",
  referee: "Referee",
  media: "Media",
  viewer: "Viewer",
};

export type WorkspaceOption = {
  assignmentId: string;
  role: PlatformRole;
  label: string;
  description: string;
  path: string;
};

export type AccessResolution =
  | { kind: "redirect"; path: string }
  | { kind: "select-workspace"; options: WorkspaceOption[] }
  | { kind: "denied"; reason: "no-profile" | "inactive-profile" | "no-assignments" };

/** Current Supabase Auth user, or null. Memoized per request. */
export const getSessionUser = cache(async () => {
  const supabase = createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  return user;
});

/** Platform profile for a user id (service-role read — profiles has no public RLS policies). Memoized per request. */
export const getProfile = cache(async (userId: string): Promise<Profile | null> => {
  const admin = supabaseAdmin();
  const { data } = await admin.from("profiles").select("*").eq("id", userId).single();
  return (data as Profile) ?? null;
});

/** Active assignments for a user id. Memoized per request. */
export const getActiveAssignments = cache(async (userId: string): Promise<UserAccessAssignment[]> => {
  const admin = supabaseAdmin();
  const { data } = await admin
    .from("user_access_assignments")
    .select("*")
    .eq("user_id", userId)
    .eq("status", "active");
  return (data as UserAccessAssignment[]) ?? [];
});

/** Builds the workspace option (label + destination path) for one assignment. Coach requires a team lookup for its token-based URL. */
async function optionForAssignment(a: UserAccessAssignment): Promise<WorkspaceOption | null> {
  if (a.role_key === "coach") {
    if (!a.team_id) return null;
    const admin = supabaseAdmin();
    const { data: team } = await admin
      .from("teams")
      .select("id, name, token, competition:competitions(name)")
      .eq("id", a.team_id)
      .single();
    if (!team) return null;
    const competitionName = (team as unknown as { competition: { name: string } | null }).competition?.name;
    return {
      assignmentId: a.id,
      role: a.role_key,
      label: team.name,
      description: competitionName ? `Coach · ${competitionName}` : "Coach",
      path: `/team/${team.token}/dashboard`,
    };
  }

  const path = ROLE_DESTINATION[a.role_key];
  if (!path) return null;
  return {
    assignmentId: a.id,
    role: a.role_key,
    label: ROLE_LABEL[a.role_key],
    description: ROLE_LABEL[a.role_key],
    path,
  };
}

/**
 * The centralized redirect resolver. Given a user id, determines where
 * they belong: a single workspace, a picker if they have more than one, or
 * a clear "not yet assigned" message. Never trusts anything from the
 * client — every value here comes from profiles/user_access_assignments,
 * read with the service-role client.
 */
export async function resolveUserDestination(userId: string): Promise<AccessResolution> {
  const profile = await getProfile(userId);
  if (!profile) return { kind: "denied", reason: "no-profile" };
  if (profile.status !== "active") return { kind: "denied", reason: "inactive-profile" };

  const assignments = await getActiveAssignments(userId);
  if (assignments.length === 0) return { kind: "denied", reason: "no-assignments" };

  const options = (await Promise.all(assignments.map(optionForAssignment))).filter(
    (o): o is WorkspaceOption => o !== null
  );

  if (options.length === 0) return { kind: "denied", reason: "no-assignments" };
  if (options.length === 1) return { kind: "redirect", path: options[0].path };
  return { kind: "select-workspace", options };
}

/**
 * Generic server-side role gate for a protected layout/page. Redirects to
 * /login if there's no session, and to /login?error=denied with a clear
 * reason if the session exists but doesn't carry one of the allowed roles
 * — this is the check the brief calls out as missing from the pre-existing
 * /admin route (which previously only checked "is anyone logged in").
 */
export async function requireRole(allowedRoles: PlatformRole[]): Promise<{ userId: string; role: PlatformRole }> {
  const user = await getSessionUser();
  if (!user) redirect("/login");

  const profile = await getProfile(user.id);
  if (!profile || profile.status !== "active") {
    redirect("/login?error=no-access");
  }

  const assignments = await getActiveAssignments(user.id);
  const match = assignments.find((a) => allowedRoles.includes(a.role_key));
  if (!match) {
    redirect("/login?error=no-access");
  }

  return { userId: user.id, role: match.role_key };
}

export async function requireAdmin() {
  return requireRole(["admin", "super_admin"]);
}
