import "server-only";
import { cache } from "react";
import { redirect, notFound } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { supabaseAdmin } from "@/lib/supabase-admin";
import type { Team } from "@/lib/types";

/**
 * Looks up a team by its private link token. Memoized per-request with
 * React's cache() so the layout and the page it wraps can both call this
 * without issuing the query twice.
 */
export const getTeamByToken = cache(async (token: string): Promise<Team | null> => {
  const admin = supabaseAdmin();
  const { data } = await admin.from("teams").select("*").eq("token", token).single();
  return (data as Team) ?? null;
});

/**
 * Gate for every authenticated coach route (dashboard, lineup, calendar,
 * profile). Two checks, both required:
 *
 *  1. Is someone logged in at all? (Supabase Auth session)
 *  2. Are they authorized for THIS team?
 *
 * #2 has two paths, checked in order (Sprint 1.2):
 *   (1) An active `user_access_assignments` row (role='coach', this team_id)
 *       - the trusted, role-based source of truth going forward.
 *   (2) Falling back to the legacy `team.coach_email` match if no
 *       assignment row exists yet - this is what stops a coach from
 *       losing access the moment this sprint ships, for any team the
 *       migration's backfill didn't already cover (e.g. a coach invited
 *       between the backfill running and the code deploying). New invites
 *       (see admin/teams/[id]/actions.ts) create a real assignment row, so
 *       this fallback is a safety net, not a permanent second system.
 */
export async function requireCoach(token: string): Promise<{ team: Team; email: string }> {
  const team = await getTeamByToken(token);
  if (!team) notFound();

  const supabase = createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user?.email) {
    redirect(`/team/${token}/login`);
  }

  const admin = supabaseAdmin();
  const { data: assignment } = await admin
    .from("user_access_assignments")
    .select("id")
    .eq("user_id", user.id)
    .eq("role_key", "coach")
    .eq("team_id", team.id)
    .eq("status", "active")
    .maybeSingle();

  const hasAssignment = !!assignment;
  const hasLegacyEmailMatch = !!team.coach_email && team.coach_email.toLowerCase() === user.email.toLowerCase();

  if (!hasAssignment && !hasLegacyEmailMatch) {
    redirect(`/team/${token}/login?error=forbidden`);
  }

  return { team, email: user.email };
}
