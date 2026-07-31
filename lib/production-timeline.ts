import "server-only";
import { supabaseAdmin } from "@/lib/supabase-admin";

/**
 * Match Preparation Timeline — built entirely from timestamps that already
 * exist (matches.created_at, lineups.submitted_at, tactical_formations
 * created_at/updated_at) plus the real audit_logs trail this app has been
 * writing to since the IAM/Broadcast Engine work. No new table: a
 * production_timeline table would just be a second copy of what audit_logs
 * and existing row timestamps already record.
 *
 * Deliberately does NOT invent entries for things with no real timestamp —
 * "Graphics Ready" and "Website Ready" are omitted here (Broadcast Graphics
 * has zero persisted state, and connection status is a live poll result,
 * not a historical event) even though the brief's example includes them.
 * They're shown as live status, not fabricated history — see
 * BroadcastOperationsCenter's status grid instead.
 */

export type TimelineEntry = {
  id: string;
  time: string;
  label: string;
  detail?: string;
};

/** matches has no updated_at column, so audit_logs is the only real record of when officials were assigned. */
export async function getRefereeAssignedAt(matchId: string): Promise<string | null> {
  const supabase = supabaseAdmin();
  const { data } = await supabase
    .from("audit_logs")
    .select("created_at")
    .eq("target_type", "match")
    .eq("target_id", matchId)
    .eq("action", "match.officials_updated")
    .order("created_at", { ascending: true })
    .limit(1)
    .maybeSingle();
  return data?.created_at ?? null;
}

export function buildProductionTimeline(input: {
  matchCreatedAt: string;
  refereeAssignedAt: string | null;
  homeLineupSubmittedAt: string | null;
  awayLineupSubmittedAt: string | null;
  homeFormationSavedAt: string | null;
  awayFormationSavedAt: string | null;
  broadcastReady: boolean;
}): TimelineEntry[] {
  const entries: TimelineEntry[] = [
    { id: "match_created", time: input.matchCreatedAt, label: "Match Created" },
  ];

  if (input.refereeAssignedAt) {
    entries.push({ id: "officials_assigned", time: input.refereeAssignedAt, label: "Officials Assigned" });
  }

  if (input.homeLineupSubmittedAt && input.awayLineupSubmittedAt) {
    const time = [input.homeLineupSubmittedAt, input.awayLineupSubmittedAt].sort().at(-1)!;
    entries.push({ id: "starting_xi_submitted", time, label: "Starting XI Submitted", detail: "Both teams" });
  }

  if (input.homeFormationSavedAt && input.awayFormationSavedAt) {
    const time = [input.homeFormationSavedAt, input.awayFormationSavedAt].sort().at(-1)!;
    entries.push({ id: "tactical_layout_completed", time, label: "Tactical Layout Completed", detail: "Both teams" });
  }

  if (input.broadcastReady) {
    entries.push({ id: "broadcast_ready", time: new Date().toISOString(), label: "Broadcast Ready" });
  }

  return entries.sort((a, b) => a.time.localeCompare(b.time));
}
