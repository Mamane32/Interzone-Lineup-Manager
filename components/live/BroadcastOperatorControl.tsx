import { setBroadcastOperator } from "@/app/live/[matchId]/actions";
import { BROADCAST_OPERATOR_LABEL, type BroadcastOperator } from "@/lib/broadcast/types";

const OPERATORS: { value: BroadcastOperator; description: string; reserved?: boolean }[] = [
  { value: "ggsp", description: "GGSP's own Broadcast Control Center is the operator — GGSP renders its own graphics." },
  { value: "vmix", description: "A human operates inside vMix directly. GGSP's own graphics output stands down." },
  { value: "obs", description: "Reserved — no OBS integration yet, inbound or outbound.", reserved: true },
];

/**
 * Active Operator switch (migration 035, matches.broadcast_operator) —
 * same "form + formAction per option" pattern as StatusControls.tsx.
 * Per-match, not global: two matches can run under different operators
 * at the same time (one produced live in vMix, one scored manually in
 * GGSP standalone).
 */
export default function BroadcastOperatorControl({ matchId, current }: { matchId: string; current: BroadcastOperator }) {
  return (
    <div className="surface-panel p-4">
      <div className="mb-3 flex items-center justify-between">
        <h2 className="text-xs font-semibold uppercase tracking-wide text-white/40">Active Operator</h2>
        <span className="text-[10px] font-medium text-white/25">Who drives this match</span>
      </div>
      <form className="flex flex-col gap-1">
        {OPERATORS.map((op) => {
          const active = op.value === current;
          return (
            <button
              key={op.value}
              type="submit"
              formAction={setBroadcastOperator.bind(null, matchId, op.value)}
              disabled={op.reserved}
              className={`group flex items-start gap-2.5 rounded-lg px-2.5 py-2 text-left text-xs font-semibold transition-all active:scale-[0.98] disabled:cursor-not-allowed disabled:opacity-40 ${
                active ? "bg-brand-400/15 text-white ring-1 ring-brand-400/40" : "text-white/55 hover:bg-white/5 hover:text-white"
              }`}
            >
              <span className={`mt-0.5 h-2 w-2 flex-none rounded-full ${active ? "bg-brand-400 shadow-[0_0_8px_1px_rgba(245,166,35,0.5)]" : "border border-white/20"}`} />
              <span className="flex-1">
                <span className="flex items-center gap-1.5">
                  {BROADCAST_OPERATOR_LABEL[op.value]}
                  {active && <span className="text-[9px] font-bold uppercase tracking-wide text-brand-400">Active</span>}
                  {op.reserved && <span className="text-[9px] font-semibold uppercase tracking-wide text-white/25">Soon</span>}
                </span>
                <span className="mt-0.5 block text-[10px] font-normal normal-case text-white/35">{op.description}</span>
              </span>
            </button>
          );
        })}
      </form>
    </div>
  );
}
