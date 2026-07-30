import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { supabaseAdmin } from "@/lib/supabase-admin";

export async function GET(_request: Request, { params }: { params: { matchId: string } }) {
  const auth = createClient();
  const {
    data: { user },
  } = await auth.auth.getUser();

  if (!user) {
    return NextResponse.json({ error: "Authentication required" }, { status: 401 });
  }

  const supabase = supabaseAdmin();
  const [{ data: profile }, { data: assignment }] = await Promise.all([
    supabase.from("profiles").select("status").eq("id", user.id).maybeSingle(),
    supabase
      .from("user_access_assignments")
      .select("id")
      .eq("user_id", user.id)
      .eq("status", "active")
      .in("role_key", ["broadcast_operator", "admin", "super_admin"])
      .limit(1)
      .maybeSingle(),
  ]);

  if (!profile || profile.status !== "active" || !assignment) {
    return NextResponse.json({ error: "Insufficient permissions" }, { status: 403 });
  }

  const { data: match } = await supabase
    .from("matches")
    .select(
      "id, live_status, home_score, away_score, venue, referee_name, match_date, match_time, home_team:teams!matches_home_team_id_fkey(id, name), away_team:teams!matches_away_team_id_fkey(id, name)"
    )
    .eq("id", params.matchId)
    .single();

  if (!match) {
    return NextResponse.json({ error: "Match not found" }, { status: 404 });
  }

  const { data: events } = await supabase
    .from("match_events")
    .select("minute, type, team_id, player_id, description, created_at")
    .eq("match_id", params.matchId)
    .order("created_at");

  return NextResponse.json({ match, events: events ?? [] });
}
