import { BROADCAST_OPERATOR_LABEL, type BroadcastOperator } from "@/lib/broadcast/types";

/**
 * Shown on app/broadcast-output/[matchId]/{program,preview} in place of
 * GGSP's own compositing whenever this match's Active Operator isn't
 * "ggsp" — per the architecture, GGSP does not render its own graphics
 * once a human is operating inside vMix/OBS directly. Full-bleed and
 * dark, same visual register as ProductionOutputFrame itself, so a
 * capture card or browser source pointed at this URL shows an obviously
 * intentional "nothing to capture here" slate, not a broken-looking page.
 */
export default function OperatorHandoffNotice({ operator }: { operator: BroadcastOperator }) {
  return (
    <div className="flex h-screen w-screen flex-col items-center justify-center gap-3 bg-black text-white">
      <p className="text-xs font-semibold uppercase tracking-[0.3em] text-white/30">GGSP Graphics — Standing Down</p>
      <p className="font-display text-2xl font-bold">Active Operator: {BROADCAST_OPERATOR_LABEL[operator]}</p>
      <p className="max-w-sm text-center text-sm text-white/40">
        This match is operated from {BROADCAST_OPERATOR_LABEL[operator]}, not GGSP — capture that system&apos;s output instead of this page.
      </p>
    </div>
  );
}
