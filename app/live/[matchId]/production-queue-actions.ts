"use server";

import { revalidatePath } from "next/cache";
import { requireRole } from "@/lib/access";
import { enqueueAndTakeProductionItem, hideProductionItem } from "@/lib/broadcast/ProductionQueueEngine";

/** Same three roles as every other Broadcast Control Center action — the queue itself has no separate permission tier. */
async function gate() {
  await requireRole(["broadcast_operator", "admin", "super_admin"]);
}

/** Broadcast Panel's Take button on a catalog entry — enqueues a fresh row for this instance (so history shows every time a graphic aired, not just a reused slot) and takes it live in the same call, matching the one-click philosophy. */
export async function takeCatalogGraphic(matchId: string, category: string, graphicKey: string, name: string) {
  await gate();
  await enqueueAndTakeProductionItem(matchId, "graphics", category, graphicKey, name);
  revalidatePath(`/live/${matchId}`);
}

export async function hideQueueItem(matchId: string, itemId: string) {
  await gate();
  await hideProductionItem(matchId, itemId);
  revalidatePath(`/live/${matchId}`);
}
