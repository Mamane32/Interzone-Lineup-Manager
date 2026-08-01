import { Star } from "lucide-react";
import type { LiveMatchBundle } from "@/lib/live-match";
import type { MatchEventType } from "@/lib/types";

// "Winning Goal" isn't a distinct stored event type (it's a judgment about
// which goal ended up deciding the match) — it's computed here as the last
// goal scored by whichever team is currently ahead, once the match is over.
const HIGHLIGHT_TYPES: MatchEventType[] = ["goal", "penalty_goal", "own_goal", "red_card", "var"];

const LABEL: Record<MatchEventType, string> = {
  goal: "Goal",
  penalty_goal: "Penalty",
  own_goal: "Own Goal",
  red_card: "Red Card",
  var: "VAR",
  yellow_card: "",
  second_yellow: "",
  substitution: "",
  penalty_missed: "",
  injury: "",
  match_start: "",
  half_time: "",
  match_resume: "",
  match_end: "",
  additional_time: "",
};

export default function HighlightsIndex({ bundle }: { bundle: LiveMatchBundle }) {
  const { match, events } = bundle;
  const goals = events.filter((e) => e.type === "goal" || e.type === "penalty_goal" || e.type === "own_goal");
  const isFinished = match.live_status === "full_time";
  const winningGoalId =
    isFinished && (match.home_score ?? 0) !== (match.away_score ?? 0) ? goals[goals.length - 1]?.id : null;

  const highlights = events
    .filter((e) => HIGHLIGHT_TYPES.includes(e.type))
    .map((e) => ({ ...e, isWinner: e.id === winningGoalId }));

  return (
    <div className="surface-panel p-4">
      <h2 className="mb-3 flex items-center gap-1.5 text-xs font-semibold uppercase tracking-wide text-white/40">
        <Star size={12} /> Highlights Index
      </h2>

      {highlights.length === 0 ? (
        <p className="text-xs text-white/30">No highlight-worthy events yet.</p>
      ) : (
        <div className="flex flex-col gap-1.5">
          {highlights.map((h) => (
            <div key={h.id} className="flex items-center gap-2 rounded-lg bg-white/[0.03] px-3 py-2 text-xs">
              <span className="w-8 flex-none text-center font-display font-bold text-white/50">{h.minute}&apos;</span>
              <span className="flex-1 truncate text-white/80">{LABEL[h.type]}</span>
              {h.isWinner && (
                <span className="rounded-full bg-amber-signal/15 px-2 py-0.5 text-[9px] font-bold text-amber-signal">
                  WINNING GOAL
                </span>
              )}
            </div>
          ))}
        </div>
      )}

      <p className="mt-3 text-[10px] text-white/25">
        Source for future automatic highlight generation — not implemented yet.
      </p>
    </div>
  );
}
