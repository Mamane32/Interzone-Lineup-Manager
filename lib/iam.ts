import "server-only";
import { supabaseAdmin } from "@/lib/supabase-admin";
import type { AccessStatus, PlatformRole, Profile, UserAccessAssignment } from "@/lib/types";

export type AssignmentWithScope = UserAccessAssignment & {
  team: { id: string; name: string } | null;
  competition: { id: string; name: string } | null;
};

export type ProfileWithAssignments = Profile & {
  assignments: AssignmentWithScope[];
};

const PAGE_SIZE = 20;

/** Attaches each user's assignments (with team/competition names resolved) to their profile row. One extra query, not N+1. */
async function attachAssignments(profiles: Profile[]): Promise<ProfileWithAssignments[]> {
  if (profiles.length === 0) return [];
  const admin = supabaseAdmin();
  const ids = profiles.map((p) => p.id);

  const { data: assignments } = await admin
    .from("user_access_assignments")
    .select("*, team:teams(id, name), competition:competitions(id, name)")
    .in("user_id", ids);

  const byUser = new Map<string, AssignmentWithScope[]>();
  for (const a of (assignments ?? []) as AssignmentWithScope[]) {
    const list = byUser.get(a.user_id) ?? [];
    list.push(a);
    byUser.set(a.user_id, list);
  }

  return profiles.map((p) => ({ ...p, assignments: byUser.get(p.id) ?? [] }));
}

export type UserSearchFilters = {
  q?: string;
  status?: AccessStatus;
  roleKey?: PlatformRole;
  competitionId?: string;
  teamId?: string;
  page?: number;
};

export async function searchUsers(filters: UserSearchFilters): Promise<{ users: ProfileWithAssignments[]; total: number; page: number; pageSize: number }> {
  const admin = supabaseAdmin();
  const page = Math.max(1, filters.page ?? 1);
  const from = (page - 1) * PAGE_SIZE;
  const to = from + PAGE_SIZE - 1;

  let userIdScope: string[] | null = null;

  // Role/competition/team filters live on assignments, not profiles —
  // resolve matching user ids first, then scope the profiles query to them.
  if (filters.roleKey || filters.competitionId || filters.teamId) {
    let scopeQuery = admin.from("user_access_assignments").select("user_id");
    if (filters.roleKey) scopeQuery = scopeQuery.eq("role_key", filters.roleKey);
    if (filters.competitionId) scopeQuery = scopeQuery.eq("competition_id", filters.competitionId);
    if (filters.teamId) scopeQuery = scopeQuery.eq("team_id", filters.teamId);
    const { data: scoped } = await scopeQuery;
    userIdScope = Array.from(new Set((scoped ?? []).map((r) => r.user_id)));
    if (userIdScope.length === 0) return { users: [], total: 0, page, pageSize: PAGE_SIZE };
  }

  let query = admin.from("profiles").select("*", { count: "exact" });
  if (filters.q) {
    const q = filters.q.replace(/[%_]/g, "");
    query = query.or(`full_name.ilike.%${q}%,email.ilike.%${q}%`);
  }
  if (filters.status) query = query.eq("status", filters.status);
  if (userIdScope) query = query.in("id", userIdScope);

  const { data: profiles, count } = await query.order("created_at", { ascending: false }).range(from, to);
  const users = await attachAssignments((profiles ?? []) as Profile[]);

  return { users, total: count ?? 0, page, pageSize: PAGE_SIZE };
}

export async function getUserWithAssignments(userId: string): Promise<ProfileWithAssignments | null> {
  const admin = supabaseAdmin();
  const { data: profile } = await admin.from("profiles").select("*").eq("id", userId).single();
  if (!profile) return null;
  const [withAssignments] = await attachAssignments([profile as Profile]);
  return withAssignments;
}

/** Live user count per role, for the Roles page. */
export async function getRoleUserCounts(): Promise<Record<string, number>> {
  const admin = supabaseAdmin();
  const { data } = await admin.from("user_access_assignments").select("role_key").eq("status", "active");
  const counts: Record<string, number> = {};
  for (const row of data ?? []) {
    counts[row.role_key] = (counts[row.role_key] ?? 0) + 1;
  }
  return counts;
}

/**
 * Teams whose coach access still relies on the Sprint 1.2 coach_email
 * fallback (no real 'coach' assignment row exists yet) — surfaced in the
 * UI so an admin can see when it's safe to remove the fallback entirely.
 */
export async function getLegacyCoachTeams(): Promise<{ id: string; name: string; coach_email: string }[]> {
  const admin = supabaseAdmin();
  const { data: teams } = await admin.from("teams").select("id, name, coach_email").not("coach_email", "is", null);
  const { data: assignments } = await admin.from("user_access_assignments").select("team_id").eq("role_key", "coach");
  const assignedTeamIds = new Set((assignments ?? []).map((a) => a.team_id));
  return ((teams ?? []) as { id: string; name: string; coach_email: string }[]).filter((t) => !assignedTeamIds.has(t.id));
}
