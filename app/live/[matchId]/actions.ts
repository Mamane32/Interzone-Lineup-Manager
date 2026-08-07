"use server";

import { requireRole } from "@/lib/access";
import { revalidatePath } from "next/cache";
import { supabaseAdmin } from "@/lib/supabase-admin";
import { recordAuditEvent } from "@/lib/audit";
import { broadcastScoreUpdate } from "@/lib/broadcast/ScoreEngine";
import { broadcastGoal, broadcastCard, broadcastSubstitution, broadcastStatusChange } from "@/lib/broadcast/EventEngine";
import { autoTriggerGraphicForEvent } from "@/lib/broadcast/graphics-automation";
import type { BroadcastOperator } from "@/lib/broadcast/types";
import type { MatchLiveStatus, MatchEventType } from "@/lib/types";

const GOAL_TYPES: MatchEventType[] = ["goal", "penalty_goal", "own_goal"];

const STATUS_LABEL: Record<MatchLiveStatus, string> = {
  pre_match: "Pre Match",
  kickoff: "Kick Off",
  first_half: "First Half",
  half_time: "Half-time",
  second_half: "Second Half",
  extra_time: "Extra Time",
  penalty_shootout: "Penalties",
  full_time: "Full Time",
};

function revalidateMatch(matchId: string) {
  revalidatePath(`/live/${matchId}`);
  revalidatePath(`/live/${matchId}/report`);
}

/**
 * Runs broadcast-layer side effects (engines + audit) after a database
 * write has already succeeded. Never allowed to fail the Server Action —
 * the database is the source of truth and has already committed by the
 * time this runs; a vMix hiccup or a transient audit-write error must not
 * turn into a broken coach/operator experience. Same philosophy as
 * lib/audit.ts's recordAuditEvent(): log and move on.
 */
async function afterBroadcastEvent(fn: () => Promise<void>) {
  try {
    await fn();
  } catch (err) {
    console.error("broadcast layer notification failed", err);
  }
}

async function resolvePlayerName(supabase: ReturnType<typeof supabaseAdmin>, playerId: string | null): Promise<string | null> {
  if (!playerId) return null;
  const { data } = await supabase.from("players").select("full_name").eq("id", playerId).maybeSingle();
  return data?.full_name ?? null;
}

/** Match Status Controls — manual only, exactly as specified ("Do not implement backend automation yet"). Covers Kick Off, Half Time, Full Time, and every other phase transition through one shared path. */
export async function setLiveStatus(matchId: string, status: MatchLiveStatus) {
  const { userId } = await requireRole(["broadcast_operator", "admin", "super_admin"]);
  const supabase = supabaseAdmin();
  const { error } = await supabase.from("matches").update({ live_status: status }).eq("id", matchId);
  revalidateMatch(matchId);

  if (!error) {
    await afterBroadcastEvent(async () => {
      await broadcastStatusChange({ matchId, statusLabel: STATUS_LABEL[status] });
      await recordAuditEvent({
        actorUserId: userId,
        action: "match.status_changed",
        targetType: "match",
        targetId: matchId,
        metadata: { status },
      });
    });
  }
}

/**
 * Adds a goal-type event AND keeps matches.home_score/away_score in sync —
 * own goals credit the *other* team's score, same as real football.
 * Covers Goal and Penalty (scored).
 */
export async function addGoalEvent(
  matchId: string,
  scoringTeamId: string,
  opponentTeamId: string,
  type: Extract<MatchEventType, "goal" | "penalty_goal" | "own_goal">,
  minute: string,
  playerId: string | null,
  description: string | null
) {
  const { userId } = await requireRole(["broadcast_operator", "admin", "super_admin"]);
  const supabase = supabaseAdmin();
  const { data: match } = await supabase.from("matches").select("home_team_id, away_team_id, home_score, away_score").eq("id", matchId).single();
  if (!match) return;

  const creditedTeamId = type === "own_goal" ? opponentTeamId : scoringTeamId;
  const isHomeCredited = creditedTeamId === match.home_team_id;

  const { error: insertError } = await supabase.from("match_events").insert({
    match_id: matchId,
    minute,
    type,
    team_id: scoringTeamId,
    player_id: playerId,
    description,
  });

  const homeScore = isHomeCredited ? (match.home_score ?? 0) + 1 : (match.home_score ?? 0);
  const awayScore = !isHomeCredited ? (match.away_score ?? 0) + 1 : (match.away_score ?? 0);

  const { error: scoreError } = await supabase
    .from("matches")
    .update(isHomeCredited ? { home_score: homeScore } : { away_score: awayScore })
    .eq("id", matchId);

  revalidateMatch(matchId);

  if (!insertError && !scoreError) {
    await afterBroadcastEvent(async () => {
      const playerName = await resolvePlayerName(supabase, playerId);
      const team = isHomeCredited ? "home" : "away";

      // Two distinct commands, not duplication: the scoreboard number and
      // the goal graphic are separate vMix inputs in the command map.
      await broadcastScoreUpdate({ matchId, homeScore, awayScore });
      await broadcastGoal({ matchId, team, playerName, minute });
      // Sprint 3 Graphics Integration — the Production Queue, not this
      // direct vMix data-sync call above, is what actually puts a "Goal"
      // graphic on air; the two are complementary (scoreboard text vs.
      // the graphic asset itself), not duplicates of each other.
      await autoTriggerGraphicForEvent(matchId, type);

      await recordAuditEvent({
        actorUserId: userId,
        action: "match.goal_scored",
        targetType: "match",
        targetId: matchId,
        metadata: { type, team_id: creditedTeamId, minute, player_id: playerId, home_score: homeScore, away_score: awayScore },
      });
    });
  }
}

/**
 * Non-goal timeline events — cards, substitutions, VAR, penalty missed,
 * injuries, and match-phase markers. Covers Yellow Card, Red Card,
 * Substitution, Injury Time, Penalty (missed), and VAR through one shared
 * path, dispatched to the right engine call based on `type`.
 */
export async function addMatchEvent(
  matchId: string,
  type: MatchEventType,
  minute: string,
  teamId: string | null,
  playerId: string | null,
  description: string | null
) {
  const { userId } = await requireRole(["broadcast_operator", "admin", "super_admin"]);
  const supabase = supabaseAdmin();
  const { data: match } = await supabase.from("matches").select("home_team_id, away_team_id").eq("id", matchId).maybeSingle();

  const { error } = await supabase.from("match_events").insert({
    match_id: matchId,
    minute,
    type,
    team_id: teamId,
    player_id: playerId,
    description,
  });
  revalidateMatch(matchId);

  if (error || !match) return;

  await afterBroadcastEvent(async () => {
    const playerName = await resolvePlayerName(supabase, playerId);
    const team: "home" | "away" | null = teamId ? (teamId === match.home_team_id ? "home" : "away") : null;

    if (type === "yellow_card" || type === "second_yellow" || type === "red_card") {
      if (!team) return;
      await broadcastCard({
        matchId,
        cardType: type === "yellow_card" ? "yellow" : type === "second_yellow" ? "second_yellow" : "red",
        team,
        playerName,
        minute,
      });
      await autoTriggerGraphicForEvent(matchId, type);
      await recordAuditEvent({
        actorUserId: userId,
        action: "match.card_issued",
        targetType: "match",
        targetId: matchId,
        metadata: { type, team_id: teamId, minute, player_id: playerId },
      });
      return;
    }

    if (type === "substitution") {
      if (!team) return;
      // match_events only stores one player_id for a substitution today —
      // the schema has no separate "player in" column — so only one side
      // of the change can be named here. Not a redesign of that schema,
      // just an honest limit of what's available to pass along.
      await broadcastSubstitution({ matchId, team, playerOutName: playerName, playerInName: null, minute });
      await autoTriggerGraphicForEvent(matchId, type);
      await recordAuditEvent({
        actorUserId: userId,
        action: "match.substitution",
        targetType: "match",
        targetId: matchId,
        metadata: { team_id: teamId, minute, player_id: playerId },
      });
      return;
    }

    // VAR, penalty missed, injury, and additional time all route through
    // the Production Queue Engine now — Sprint 3's "single dispatch layer
    // for graphics" rule. These three used to call GraphicsEngine's
    // takeGraphic() directly, bypassing the queue entirely (no persisted
    // row, invisible to Program/Preview and to BroadcastPanel's own
    // state) — autoTriggerGraphicForEvent is the one path now, same as
    // every other graphic-triggering event above.
    if (type === "var" || type === "penalty_missed" || type === "injury" || type === "additional_time") {
      await autoTriggerGraphicForEvent(matchId, type);
      await recordAuditEvent({
        actorUserId: userId,
        action:
          type === "var" ? "match.var_review" : type === "penalty_missed" ? "match.penalty_missed" : type === "injury" ? "match.injury" : "match.additional_time",
        targetType: "match",
        targetId: matchId,
        metadata: { team_id: teamId, minute, player_id: playerId },
      });
      return;
    }
    // match_start / half_time / match_resume / match_end timeline markers:
    // the match-phase broadcast notification for these already happens
    // through setLiveStatus, which is what actually drives live_status —
    // no separate engine dispatch here to avoid announcing the same phase
    // change twice.
  });
}

/**
 * Deletes a timeline event. If it was a goal-type event, decrements the
 * credited team's score to match — this IS "Undo Goal" (undo is just
 * deleting the most recent goal event; the confirmation dialog and "most
 * recent" selection live in the UI, this action just needs an event id).
 */
export async function deleteMatchEvent(matchId: string, eventId: string) {
  await requireRole(["broadcast_operator", "admin", "super_admin"]);
  const supabase = supabaseAdmin();
  const { data: event } = await supabase
    .from("match_events")
    .select("*")
    .eq("id", eventId)
    .eq("match_id", matchId)
    .single();
  if (!event) return;

  await supabase.from("match_events").delete().eq("id", eventId).eq("match_id", matchId);

  if (GOAL_TYPES.includes(event.type)) {
    const { data: match } = await supabase.from("matches").select("home_team_id, away_team_id, home_score, away_score").eq("id", matchId).single();
    if (match) {
      const creditedTeamId = event.type === "own_goal" ? (event.team_id === match.home_team_id ? match.away_team_id : match.home_team_id) : event.team_id;
      const isHomeCredited = creditedTeamId === match.home_team_id;
      await supabase
        .from("matches")
        .update(
          isHomeCredited
            ? { home_score: Math.max(0, (match.home_score ?? 0) - 1) }
            : { away_score: Math.max(0, (match.away_score ?? 0) - 1) }
        )
        .eq("id", matchId);
    }
  }

  revalidateMatch(matchId);
}

/** Edits an existing timeline event's minute/team/player/description in place. Does not touch score even for goal-type events — use deleteMatchEvent + addGoalEvent if the team/type of a goal needs to change. */
export async function updateMatchEvent(
  matchId: string,
  eventId: string,
  minute: string,
  teamId: string | null,
  playerId: string | null,
  description: string | null
) {
  await requireRole(["broadcast_operator", "admin", "super_admin"]);
  const supabase = supabaseAdmin();
  await supabase
    .from("match_events")
    .update({ minute, team_id: teamId, player_id: playerId, description })
    .eq("id", eventId)
    .eq("match_id", matchId);
  revalidateMatch(matchId);
}

/**
 * Undo Last Action — removes the single most recent timeline event,
 * regardless of type (broader than "Undo Last Goal" in Score Control,
 * which only considers goals). Reuses deleteMatchEvent's score-adjustment
 * logic, so undoing a goal here still corrects the score.
 */
export async function undoLastEvent(matchId: string) {
  await requireRole(["broadcast_operator", "admin", "super_admin"]);
  const supabase = supabaseAdmin();
  const { data: last } = await supabase
    .from("match_events")
    .select("id")
    .eq("match_id", matchId)
    .order("created_at", { ascending: false })
    .limit(1)
    .maybeSingle();

  if (last) {
    await deleteMatchEvent(matchId, last.id);
  }
}

/** Manual Score Edit — direct override, independent of the event log. */
export async function setManualScore(matchId: string, homeScore: number, awayScore: number) {
  await requireRole(["broadcast_operator", "admin", "super_admin"]);
  const supabase = supabaseAdmin();
  await supabase
    .from("matches")
    .update({ home_score: Math.max(0, homeScore), away_score: Math.max(0, awayScore) })
    .eq("id", matchId);
  revalidateMatch(matchId);
}

/**
 * Match Header — venue, referee, and the rest of the officiating crew
 * (Sprint 3: assistant referees, fourth official, VAR official — plain
 * nullable columns per product decision, not a separate entities table).
 * Sprint 4 added the stream watch link and its Featured Broadcasts pin
 * (migration 034) to this same form, for the same reason: one match, one
 * of each, no new table.
 */
export async function updateMatchHeaderInfo(matchId: string, formData: FormData) {
  const { userId } = await requireRole(["broadcast_operator", "admin", "super_admin"]);
  const str = (name: string) => String(formData.get(name) ?? "").trim() || null;
  const venue = str("venue");
  const refereeName = str("refereeName");
  const assistantReferee1Name = str("assistantReferee1Name");
  const assistantReferee2Name = str("assistantReferee2Name");
  const fourthOfficialName = str("fourthOfficialName");
  const varOfficialName = str("varOfficialName");
  const venueId = str("venueId");
  const streamUrl = str("streamUrl");
  const isFeaturedBroadcast = formData.get("isFeaturedBroadcast") === "on";

  const supabase = supabaseAdmin();
  const { error } = await supabase
    .from("matches")
    .update({
      venue,
      venue_id: venueId,
      referee_name: refereeName,
      assistant_referee_1_name: assistantReferee1Name,
      assistant_referee_2_name: assistantReferee2Name,
      fourth_official_name: fourthOfficialName,
      var_official_name: varOfficialName,
      stream_url: streamUrl,
      is_featured_broadcast: isFeaturedBroadcast,
    })
    .eq("id", matchId);
  revalidateMatch(matchId);

  // Powers the Production Timeline's "Officials Assigned" entry — matches
  // has no updated_at column, so the audit log is the only real timestamp
  // for when this happened.
  if (!error && refereeName) {
    await afterBroadcastEvent(async () => {
      await recordAuditEvent({
        actorUserId: userId,
        action: "match.officials_updated",
        targetType: "match",
        targetId: matchId,
        metadata: { referee_name: refereeName, venue },
      });
    });
  }
}

/**
 * Sets this match's Active Operator (migration 035) — "ggsp" (GGSP's own
 * Broadcast Control Center is the operator, GGSP renders its own
 * graphics via app/broadcast-output) or "vmix"/"obs" (a human operates
 * inside that external system directly; GGSP's own graphics output
 * stands down — see app/broadcast-output/[matchId]/{program,preview}).
 * Purely a mode switch: it does not itself move any data, dispatch any
 * command, or require the chosen system to actually be connected —
 * choosing "vmix" with VMIX_HOST unset is a valid (if not yet useful)
 * state, same honesty as every other status in this file.
 */
export async function setBroadcastOperator(matchId: string, operator: BroadcastOperator) {
  const { userId } = await requireRole(["broadcast_operator", "admin", "super_admin"]);
  const supabase = supabaseAdmin();
  const { error } = await supabase.from("matches").update({ broadcast_operator: operator }).eq("id", matchId);
  revalidateMatch(matchId);
  revalidatePath(`/broadcast-output/${matchId}/program`);
  revalidatePath(`/broadcast-output/${matchId}/preview`);

  if (!error) {
    await afterBroadcastEvent(async () => {
      await recordAuditEvent({
        actorUserId: userId,
        action: "match.broadcast_operator_changed",
        targetType: "match",
        targetId: matchId,
        metadata: { operator },
      });
    });
  }
}
