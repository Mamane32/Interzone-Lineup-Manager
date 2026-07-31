import { SYSTEMS, type SystemState } from "@/components/live/ProductionStatusPanel";
import type { LineupStatus } from "@/lib/types";

export type LiveAlert = { id: string; label: string; severity: "critical" | "warning" };

/**
 * Real, truthful alerts only — every one here is derived from actual state
 * (lineup submission status, the same ProductionStatusPanel system list),
 * never decorative. This is what makes the strip a genuine "what needs my
 * attention right now" surface instead of a static status board.
 *
 * Deliberately kept in a plain module (no "use client") because it's a pure
 * function called directly from Server Components (BroadcastHeader) — a
 * "use client" module's exports are replaced with client-reference proxies
 * on the server, so calling this from a Server Component would throw
 * "deriveLiveAlerts is not a function" if it lived in LiveAlerts.tsx.
 */
export function deriveLiveAlerts(params: {
  isLive: boolean;
  homeTeamName: string;
  awayTeamName: string;
  homeLineupStatus: LineupStatus | null;
  awayLineupStatus: LineupStatus | null;
  vmixState?: SystemState;
}): LiveAlert[] {
  const alerts: LiveAlert[] = [];

  if (params.homeLineupStatus !== "submitted") {
    alerts.push({
      id: "home-lineup",
      label: `${params.homeTeamName}: lineup not submitted`,
      severity: params.isLive ? "critical" : "warning",
    });
  }
  if (params.awayLineupStatus !== "submitted") {
    alerts.push({
      id: "away-lineup",
      label: `${params.awayTeamName}: lineup not submitted`,
      severity: params.isLive ? "critical" : "warning",
    });
  }

  if (params.isLive) {
    for (const system of SYSTEMS) {
      if (system.state === "offline") {
        alerts.push({ id: `system-${system.key}`, label: `${system.label} offline`, severity: "warning" });
      }
    }
  }

  // A misconfigured vMix (VMIX_HOST set but unreachable) is worth
  // surfacing any time, not just while live — an operator needs to know
  // before kickoff, not discover it mid-match.
  if (params.vmixState === "offline") {
    alerts.push({ id: "system-vmix-error", label: "vMix configured but unreachable", severity: "warning" });
  }

  return alerts;
}
