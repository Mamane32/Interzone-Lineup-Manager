"use server";

import { redirect } from "next/navigation";
import { requireAdmin, getSessionUser } from "@/lib/access";
import { revalidatePath } from "next/cache";
import { supabaseAdmin } from "@/lib/supabase-admin";
import { recordAuditEvent } from "@/lib/audit";

export type MatchActionResult = { ok: true } | { ok: false; error: string };

export async function createMatch(formData: FormData) {
  await requireAdmin();
  const str = (name: string) => String(formData.get(name) ?? "").trim() || null;

  const competition_id = str("competition_id");
  const round = str("round");
  const home_team_id = String(formData.get("home_team_id") ?? "");
  const away_team_id = String(formData.get("away_team_id") ?? "");
  const match_date = String(formData.get("match_date") ?? "");
  const match_time = String(formData.get("match_time") ?? "");
  // Only the most specific level a user picks needs to be sent — the
  // matches_check_hierarchy trigger (migration 008) backfills every less
  // specific ancestor (group -> stage -> division -> season -> competition)
  // and rejects a combination that doesn't actually nest correctly.
  const season_id = str("season_id");
  const division_id = str("division_id");
  const stage_id = str("stage_id");
  const group_id = str("group_id");
  const venue_id = str("venue_id");

  if (!home_team_id || !away_team_id || home_team_id === away_team_id) return;
  if (!match_date || !match_time) return;

  const supabase = supabaseAdmin();
  const { error } = await supabase.from("matches").insert({
    competition_id,
    round,
    home_team_id,
    away_team_id,
    match_date,
    match_time,
    season_id,
    division_id,
    stage_id,
    group_id,
    venue_id,
  });

  if (error) {
    console.error("createMatch failed", error);
    redirect("/admin/matches?error=save-failed");
  }

  revalidatePath("/admin/matches");
  revalidatePath("/admin/dashboard");
  revalidatePath("/admin/lineups");
}

/**
 * Every child table below already carries `on delete cascade` back to
 * `matches` in the schema (match_events, lineups, tactical_formations —
 * whose own child tactical_positions cascades a second time off THAT —
 * production_queue, match_statistics; confirmed directly against
 * supabase/schema.sql and migrations 002/007/013/015). This action still
 * deletes each of them explicitly, in dependency order, before deleting
 * the match itself, for two reasons: (1) it turns a delete that used to
 * silently discard its error — the previous implementation never checked
 * `error` at all, so a failed delete looked identical to a successful one
 * and the match simply reappeared after the page revalidated, which is
 * exactly what "Delete Match currently fails" describes — into one where
 * every step's error is caught and surfaced to the admin; (2) it makes
 * the "no orphan records" guarantee explicit in code rather than resting
 * entirely on cascade configuration matching what's actually deployed.
 */
export async function deleteMatch(id: string): Promise<MatchActionResult> {
  await requireAdmin();
  const actor = await getSessionUser();
  const supabase = supabaseAdmin();

  const { data: match } = await supabase
    .from("matches")
    .select("id, home_team_id, away_team_id, match_date")
    .eq("id", id)
    .maybeSingle();
  if (!match) {
    return { ok: false, error: "That match no longer exists." };
  }

  const { data: formations } = await supabase.from("tactical_formations").select("id").eq("match_id", id);
  const formationIds = (formations ?? []).map((f) => f.id as string);

  const { error: eventsError } = await supabase.from("match_events").delete().eq("match_id", id);
  if (eventsError) {
    console.error("deleteMatch: clearing match_events failed", id, eventsError);
    return { ok: false, error: "Could not clear this match's related data. Please try again." };
  }

  if (formationIds.length > 0) {
    const { error: positionsError } = await supabase.from("tactical_positions").delete().in("tactical_formation_id", formationIds);
    if (positionsError) {
      console.error("deleteMatch: clearing tactical_positions failed", id, positionsError);
      return { ok: false, error: "Could not clear this match's related data. Please try again." };
    }
  }

  const { error: formationsError } = await supabase.from("tactical_formations").delete().eq("match_id", id);
  if (formationsError) {
    console.error("deleteMatch: clearing tactical_formations failed", id, formationsError);
    return { ok: false, error: "Could not clear this match's related data. Please try again." };
  }

  const { error: lineupsError } = await supabase.from("lineups").delete().eq("match_id", id);
  if (lineupsError) {
    console.error("deleteMatch: clearing lineups failed", id, lineupsError);
    return { ok: false, error: "Could not clear this match's related data. Please try again." };
  }

  const { error: queueError } = await supabase.from("production_queue").delete().eq("match_id", id);
  if (queueError) {
    console.error("deleteMatch: clearing production_queue failed", id, queueError);
    return { ok: false, error: "Could not clear this match's related data. Please try again." };
  }

  const { error: statsError } = await supabase.from("match_statistics").delete().eq("match_id", id);
  if (statsError) {
    console.error("deleteMatch: clearing match_statistics failed", id, statsError);
    return { ok: false, error: "Could not clear this match's related data. Please try again." };
  }

  const { error: matchError } = await supabase.from("matches").delete().eq("id", id);
  if (matchError) {
    console.error("deleteMatch failed", id, matchError);
    return { ok: false, error: "Could not delete this match. Please try again." };
  }

  if (actor) {
    await recordAuditEvent({
      actorUserId: actor.id,
      action: "match.deleted",
      targetType: "match",
      targetId: id,
      metadata: { home_team_id: match.home_team_id, away_team_id: match.away_team_id, match_date: match.match_date },
    });
  }

  revalidatePath("/admin/matches");
  revalidatePath("/admin/dashboard");
  revalidatePath("/admin/lineups");
  return { ok: true };
}
