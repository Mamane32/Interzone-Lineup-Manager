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
  return (
    <div className="rounded-2xl border border-white/10 bg-white/[0.03] p-4">
      <h2 className="mb-3 text-xs font-semibold uppercase tracking-wide text-white/40">Match Status</h2>
      <form className="grid grid-cols-2 gap-2">
        {STAGES.map((s) => {
          const active = s.value === current;
          return (
            <button
              key={s.value}
              type="submit"
              formAction={setLiveStatus.bind(null, matchId, s.value)}
              className={`rounded-lg px-2.5 py-2 text-xs font-semibold transition-all active:scale-95 ${
                active
                  ? "bg-red-500 text-white shadow-[0_0_0_3px_rgba(239,68,68,0.25)]"
                  : "bg-white/5 text-white/60 hover:bg-white/10 hover:text-white"
              }`}
            >
              {s.label}
            </button>
          );
        })}
      </form>
    </div>
  );
}
