import { BROADCAST_OPERATOR_LABEL, type BroadcastOperator } from "@/lib/broadcast/types";
import type { BroadcastCapabilityKey } from "@/lib/broadcast/runtime/types";

const CAPABILITY_LABEL: Record<BroadcastCapabilityKey, string> = {
  clock: "Clock",
  match_events: "Match Events",
  graphics: "Graphics",
  replay: "Replay",
  recording: "Recording",
  streaming: "Streaming",
  audio: "Audio",
  camera: "Camera",
  commentary: "Commentary",
  animation: "Animation",
  tactical_formation: "Tactical Formation",
  website: "Website",
  statistics: "Statistics",
};

/**
 * Read-only proof of the Production Runtime's ownership resolution
 * (lib/broadcast/runtime/ownership.ts) — Phase 2's vertical slice ends at
 * "become the active owner for Clock and Graphics," so this only shows
 * those two rows, not the full capability list ownership.ts's type
 * technically covers. No mutation here: switching who owns a capability
 * still happens one level up, via BroadcastOperatorControl's Active
 * Operator switch — this panel exists to make that switch's actual,
 * resolved effect visible, not to duplicate the control.
 */
export default function CapabilityOwnershipPanel({ owners }: { owners: Partial<Record<BroadcastCapabilityKey, BroadcastOperator>> }) {
  const rows = (Object.keys(owners) as BroadcastCapabilityKey[]).filter((key) => owners[key]);

  return (
    <div className="surface-panel p-4">
      <div className="mb-3 flex items-center justify-between">
        <h2 className="text-xs font-semibold uppercase tracking-wide text-white/40">Capability Ownership</h2>
        <span className="text-[10px] font-medium text-white/25">Resolved by the Production Runtime</span>
      </div>
      <div className="grid grid-cols-2 gap-2">
        {rows.map((key) => {
          const owner = owners[key]!;
          return (
            <div key={key} className="surface-recessed flex flex-col gap-1 p-2.5">
              <span className="text-[10px] font-medium text-white/50">{CAPABILITY_LABEL[key]}</span>
              <span className="text-xs font-bold text-white">{BROADCAST_OPERATOR_LABEL[owner]}</span>
            </div>
          );
        })}
      </div>
    </div>
  );
}
