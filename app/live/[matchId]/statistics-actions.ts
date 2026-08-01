"use server";

import { revalidatePath } from "next/cache";
import { requireRole } from "@/lib/access";
import { adjustMatchStatistic, adjustPossession, type StatField } from "@/lib/match-statistics";

/** Same three roles as every other Broadcast Control Center action. */
async function gate() {
  await requireRole(["broadcast_operator", "admin", "super_admin"]);
}

export async function adjustStatistic(matchId: string, teamId: string, field: StatField, delta: number) {
  await gate();
  await adjustMatchStatistic(matchId, teamId, field, delta);
  revalidatePath(`/live/${matchId}`);
}

export async function adjustPossessionStat(matchId: string, teamId: string, opponentTeamId: string, delta: number) {
  await gate();
  await adjustPossession(matchId, teamId, opponentTeamId, delta);
  revalidatePath(`/live/${matchId}`);
}
