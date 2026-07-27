import { NextResponse } from "next/server";
import { supabaseAdmin } from "@/lib/supabase-admin";

/**
 * API PLACEHOLDER — scaffolding for future external integrations (vMix
 * overlays, website embeds, UTC feeds), per the Sprint 2 brief: "Build the
 * architecture... so they are ready for future integration" while
 * explicitly NOT implementing real vMix communication yet.
 *
 * This is intentionally minimal and read-only. Before connecting any real
 * external system, this route needs actual authentication (an API key or
 * signed token) — right now it has none, so treat it as a contract shape,
 * not a production endpoint. Do not point real broadcast infrastructure at
 * this without adding auth first.
 */
export async function GET(_request: Request, { params }: { params: { matchId: string } }) {
  const supabase = supabaseAdmin();

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

  return NextResponse.json({
    match,
    events: events ?? [],
    meta: {
      note: "Placeholder API — no authentication implemented. Not for production external use yet.",
    },
  });
}
