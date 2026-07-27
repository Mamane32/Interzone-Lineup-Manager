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
 *  2. Does their email match THIS team's registered coach_email?
 *
 * #2 is what stops a coach who is legitimately logged in from viewing a
 * different team's dashboard just by changing the token in the URL — no
 * new tables or columns needed, since coach_email already existed on
 * `teams` for WhatsApp/contact purposes.
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

  if (!team.coach_email || team.coach_email.toLowerCase() !== user.email.toLowerCase()) {
    redirect(`/team/${token}/login?error=forbidden`);
  }

  return { team, email: user.email };
}
