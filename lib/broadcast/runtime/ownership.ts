import "server-only";
import { supabaseAdmin } from "@/lib/supabase-admin";
import type { BroadcastOperator } from "../types";
import { getProvider } from "./providers";
import { ENGINE_FIXED_CAPABILITIES, type BroadcastCapabilityKey } from "./types";

/**
 * Resolves which provider owns a capability, given an already-known active
 * operator — the pure half of BROADCAST_RUNTIME_ARCHITECTURE.md section
 * 10's three-step resolution. This phase implements steps 1 and 3 only;
 * step 2 (a profile's resolved override) has no REGISTERED_PROFILES yet —
 * see the architecture document's Phase 1.5 — so it's skipped, not stubbed.
 *
 * Never throws, never returns an operator that can't actually own the
 * capability: if the active operator hasn't declared it (a match set to
 * "vmix" asking about "recording", which VMixProvider doesn't claim),
 * this honestly falls back to "ggsp" rather than pretending the assignment
 * is real. Kept synchronous and DB-free so it's directly unit-testable —
 * see tests/characterization/broadcast-runtime.test.ts.
 */
export function resolveOwnerForOperator(operator: BroadcastOperator, capability: BroadcastCapabilityKey): BroadcastOperator {
  if (ENGINE_FIXED_CAPABILITIES.includes(capability)) return "ggsp";

  const provider = getProvider(operator);
  if (provider && provider.capabilities.canOwn.includes(capability)) return operator;

  return "ggsp";
}

/** Reads the match's active operator, then resolves ownership for one capability against it — the callable a Server Component reaches for. */
export async function resolveOwner(matchId: string, capability: BroadcastCapabilityKey): Promise<BroadcastOperator> {
  const supabase = supabaseAdmin();
  const { data } = await supabase.from("matches").select("broadcast_operator").eq("id", matchId).maybeSingle();
  const operator = (data?.broadcast_operator as BroadcastOperator | null) ?? "ggsp";
  return resolveOwnerForOperator(operator, capability);
}
