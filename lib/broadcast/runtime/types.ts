/**
 * Production Runtime — Phase 2's minimal vertical slice. See
 * BROADCAST_RUNTIME_ARCHITECTURE.md sections 3 and 10 for the full design;
 * this phase implements only the subset that vertical slice needs
 * (Provider registration, Connection/Health, Capability reporting, and
 * ownership resolution for "clock" and "graphics") — not Profiles, the
 * Event Bus, Diagnostics, or Outputs, which stay documentation-only until
 * this slice is proven.
 */

/**
 * The full capability vocabulary the architecture document defines.
 * Declaring the whole set here costs nothing (it's a type), but only
 * "clock" and "graphics" have a real, registered owner this phase — see
 * providers.ts's honest `canOwn` lists. Every other key exists so later
 * phases don't need a type change to add real capabilities, one at a time.
 */
export type BroadcastCapabilityKey =
  | "clock"
  | "match_events"
  | "graphics"
  | "replay"
  | "recording"
  | "streaming"
  | "audio"
  | "camera"
  | "commentary"
  | "animation"
  | "tactical_formation"
  | "website"
  | "statistics";

/** Never assignable to any other provider, in any circumstance — GGSP is always the Engine for these two, regardless of which system is the Active Operator. */
export const ENGINE_FIXED_CAPABILITIES: BroadcastCapabilityKey[] = ["website", "statistics"];

export interface ProviderCapabilities {
  /** Capabilities this provider is able to be the source of truth for. */
  canOwn: BroadcastCapabilityKey[];
  /** Capabilities this provider accepts outbound dispatch() for. */
  canReceiveCommands: BroadcastCapabilityKey[];
}
