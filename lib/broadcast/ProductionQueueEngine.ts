import "server-only";
import { supabaseAdmin } from "@/lib/supabase-admin";
import { takeGraphic, hideGraphic } from "./GraphicsEngine";

export type ProductionQueueStatus = "queued" | "live" | "hidden";

export type ProductionQueueItem = {
  id: string;
  matchId: string;
  consumer: string;
  category: string;
  itemKey: string;
  name: string;
  payload: Record<string, unknown> | null;
  status: ProductionQueueStatus;
  queueOrder: number;
};

export type ProductionQueueConsumerHandler = {
  consumer: string;
  onTake: (item: ProductionQueueItem) => Promise<void>;
  onHide: (item: ProductionQueueItem) => Promise<void>;
};

/**
 * Registered the same way BroadcastEngine.ts registers production systems
 * (VMixEngine today; ObsEngine/RossEngine later go in that same array,
 * with zero change to anything that calls BroadcastEngine.dispatch()).
 * take()/hide() below look up the handler matching an item's `consumer`
 * and call it — the engine itself never branches on consumer type.
 *
 * Graphics is the only real entry today. Replay, Animations, Sponsor
 * Graphics, Commercial Breaks, Transitions, Audio Cues, Countdown, and
 * future Automation/AI modules are named future consumers (per product
 * decision) this same registry will hold the day each has real dispatch
 * logic — matching automation-hooks.ts's "extension point, not
 * automation" rule: a consumer isn't scaffolded here before it does
 * something real. Adding one is: write its onTake/onHide, push it onto
 * this array — no schema change, no change to enqueue/take/hide/list below.
 */
const graphicsConsumerHandler: ProductionQueueConsumerHandler = {
  consumer: "graphics",
  onTake: async (item) => {
    await takeGraphic({ matchId: item.matchId, graphicId: item.itemKey, category: item.category });
  },
  onHide: async (item) => {
    await hideGraphic({ matchId: item.matchId, graphicId: item.itemKey });
  },
};

const REGISTERED_CONSUMERS: ProductionQueueConsumerHandler[] = [graphicsConsumerHandler];

type ProductionQueueRow = {
  id: string;
  match_id: string;
  consumer: string;
  category: string;
  item_key: string;
  name: string;
  payload: Record<string, unknown> | null;
  status: ProductionQueueStatus;
  queue_order: number;
};

function mapRow(row: ProductionQueueRow): ProductionQueueItem {
  return {
    id: row.id,
    matchId: row.match_id,
    consumer: row.consumer,
    category: row.category,
    itemKey: row.item_key,
    name: row.name,
    payload: row.payload,
    status: row.status,
    queueOrder: row.queue_order,
  };
}

/** Read access — no permission check of its own; the caller (a Server Component page or a permission-boundary action) already resolved who's allowed to see this match's queue. */
export async function listProductionQueue(matchId: string, consumer?: string): Promise<ProductionQueueItem[]> {
  const supabase = supabaseAdmin();
  let query = supabase.from("production_queue").select("*").eq("match_id", matchId).order("queue_order", { ascending: true });
  if (consumer) query = query.eq("consumer", consumer);

  const { data } = await query;
  return ((data ?? []) as ProductionQueueRow[]).map(mapRow);
}

export async function enqueueProductionItem(
  matchId: string,
  consumer: string,
  category: string,
  itemKey: string,
  name: string,
  payload: Record<string, unknown> | null = null
): Promise<ProductionQueueItem | null> {
  const supabase = supabaseAdmin();
  const { data } = await supabase
    .from("production_queue")
    .insert({ match_id: matchId, consumer, category, item_key: itemKey, name, payload })
    .select("*")
    .single();

  return data ? mapRow(data as ProductionQueueRow) : null;
}

/**
 * Enqueue-then-take as one call — the "log this and put it on air in the
 * same motion" case every automatic trigger needs (a Quick Bar catalog
 * click, a Sprint 3 timeline-event auto-graphic). One shared function so
 * neither call site re-implements the two-step sequence itself.
 */
export async function enqueueAndTakeProductionItem(
  matchId: string,
  consumer: string,
  category: string,
  itemKey: string,
  name: string,
  payload: Record<string, unknown> | null = null
): Promise<void> {
  const item = await enqueueProductionItem(matchId, consumer, category, itemKey, name, payload);
  if (item) await takeProductionItem(matchId, item.id);
}

/** Persists status='live' first (hiding whatever this consumer had live before), then dispatches — persistence is the source of truth for "what should be on air," a dispatch failure is a system-connectivity problem, not a reason to leave the queue's own state ambiguous. */
export async function takeProductionItem(matchId: string, itemId: string): Promise<void> {
  const supabase = supabaseAdmin();
  const { data: row } = await supabase.from("production_queue").select("*").eq("id", itemId).eq("match_id", matchId).maybeSingle();
  if (!row) return;
  const item = mapRow(row as ProductionQueueRow);

  await supabase
    .from("production_queue")
    .update({ status: "hidden" })
    .eq("match_id", matchId)
    .eq("consumer", item.consumer)
    .eq("status", "live");

  await supabase.from("production_queue").update({ status: "live" }).eq("id", itemId);

  const handler = REGISTERED_CONSUMERS.find((h) => h.consumer === item.consumer);
  if (handler) await handler.onTake(item);
}

export async function hideProductionItem(matchId: string, itemId: string): Promise<void> {
  const supabase = supabaseAdmin();
  const { data: row } = await supabase.from("production_queue").select("*").eq("id", itemId).eq("match_id", matchId).maybeSingle();
  if (!row) return;
  const item = mapRow(row as ProductionQueueRow);

  await supabase.from("production_queue").update({ status: "hidden" }).eq("id", itemId);

  const handler = REGISTERED_CONSUMERS.find((h) => h.consumer === item.consumer);
  if (handler) await handler.onHide(item);
}

export async function reorderProductionQueue(matchId: string, consumer: string, orderedItemIds: string[]): Promise<void> {
  const supabase = supabaseAdmin();
  await Promise.all(
    orderedItemIds.map((id, index) =>
      supabase.from("production_queue").update({ queue_order: index }).eq("id", id).eq("match_id", matchId).eq("consumer", consumer)
    )
  );
}

/** Only a still-queued item can be removed outright — a live or already-hidden one stays as same-match history of what actually aired. */
export async function removeProductionItem(matchId: string, itemId: string): Promise<void> {
  const supabase = supabaseAdmin();
  await supabase.from("production_queue").delete().eq("id", itemId).eq("match_id", matchId).eq("status", "queued");
}
