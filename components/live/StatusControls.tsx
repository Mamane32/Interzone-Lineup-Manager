import { setLiveStatus } from "@/app/live/[matchId]/actions";
import type { MatchLiveStatus } from "@/lib/types";

const STAGES: { value: MatchLiveStatus; label: string }[] = [
  { value: "pre_match", label: "Pre Match" },
  { value: "kickoff", label: "Kick Off" },
  { value: "first_half", label: "First Half" },
  { value: "half_time", label: "Half Time" },
  { value: "second_half", label: "Second Half" },
  { value: "extra_time", label: "Extra Time" },
  { value: "penalty_shootout", label: "Penalty Shootout" },
  { value: "full_time", label: "Full Time" },
];

export default function StatusControls({ matchId, current }: { matchId: string; current: MatchLiveStatus }) {
  const currentIndex = STAGES.findIndex((s) => s.value === current);

  return (
    <div className="surface-panel p-4">
      <div className="mb-3 flex items-center justify-between">
        <h2 className="text-xs font-semibold uppercase tracking-wide text-white/40">Match Status</h2>
        <span className="text-[10px] font-medium text-white/25">Broadcast run order</span>
      </div>
      <form className="flex flex-col gap-1">
        {STAGES.map((s, i) => {
          const active = i === currentIndex;
          const past = i < currentIndex;
          return (
            <button
              key={s.value}
              type="submit"
              formAction={setLiveStatus.bind(null, matchId, s.value)}
              className={`group flex items-center gap-2.5 rounded-lg px-2.5 py-2 text-left text-xs font-semibold transition-all active:scale-[0.98] ${
                active
                  ? "bg-red-500/15 text-white ring-1 ring-red-500/40"
                  : past
                    ? "text-white/30 hover:bg-white/5 hover:text-white/50"
                    : "text-white/55 hover:bg-white/5 hover:text-white"
              }`}
            >
              <span
                className={`h-2 w-2 flex-none rounded-full ${
                  active ? "bg-red-500 shadow-[0_0_8px_1px_rgba(239,68,68,0.6)]" : past ? "bg-white/15" : "border border-white/20"
                }`}
              />
              <span className="flex-1">{s.label}</span>
              {active && <span className="text-[9px] font-bold uppercase tracking-wide text-red-400">Now</span>}
            </button>
          );
        })}
      </form>
    </div>
  );
}
