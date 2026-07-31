/**
 * Post-Game Workflow — preparation only, per the brief. The real, working
 * lifecycle today is entirely the existing `match_live_status` enum
 * (supabase/migrations/002_live_center.sql), driven by StatusControls /
 * setLiveStatus: pre_match → kickoff → first_half → half_time →
 * second_half → extra_time → penalty_shootout → full_time.
 *
 * "Post Match" and "Archived" are NOT added to that enum here — the
 * database schema is frozen/approved, and adding enum values is a real
 * migration, not something to do speculatively. This file documents the
 * intended extension as typed reference data (implemented: false), the
 * same pattern as PLANNED_READINESS_CHECKS and VMIX_COMMAND_MAP's `wired:
 * false` rows — so the day this is actually built, it's one migration
 * adding two enum values plus wiring, not an architecture change.
 */

export type ProductionPhase = "pre_match" | "live" | "half_time" | "full_time" | "post_match" | "archived";

import type { MatchLiveStatus } from "@/lib/types";

/** Maps the real matches.live_status value onto the simplified lifecycle stepper. */
export function matchLiveStatusToPhase(status: MatchLiveStatus): ProductionPhase {
  if (status === "pre_match" || status === "kickoff") return "pre_match";
  if (status === "half_time") return "half_time";
  if (status === "full_time") return "full_time";
  return "live";
}

export const PRODUCTION_LIFECYCLE: { phase: ProductionPhase; label: string; implemented: boolean; detail: string }[] = [
  { phase: "pre_match", label: "Pre Match", implemented: true, detail: "matches.live_status = pre_match / kickoff" },
  { phase: "live", label: "Live", implemented: true, detail: "matches.live_status = first_half / second_half / extra_time / penalty_shootout" },
  { phase: "half_time", label: "Half Time", implemented: true, detail: "matches.live_status = half_time" },
  { phase: "full_time", label: "Full Time", implemented: true, detail: "matches.live_status = full_time" },
  { phase: "post_match", label: "Post Match", implemented: false, detail: "Planned — not yet a matches.live_status value" },
  { phase: "archived", label: "Archived", implemented: false, detail: "Planned — not yet a matches.live_status value" },
];
