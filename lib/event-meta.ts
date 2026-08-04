import {
  Goal as GoalIcon,
  Target,
  Square,
  SquareStack,
  ArrowLeftRight,
  MonitorPlay,
  XCircle,
  HeartPulse,
  Play,
  Pause,
  Flag,
  Hourglass,
  type LucideIcon,
} from "lucide-react";
import type { MatchEventType } from "@/lib/types";

/**
 * One icon language for the whole Live Match Experience. Lives outside any
 * "use client" module — lucide-react icon components are safe to import from
 * a plain module and render from a Server Component (`<meta.icon />`), but a
 * Server Component reading a *data* property (`meta.tone`, `meta.label`) off
 * a value re-exported from a "use client" file throws at render time. This
 * map is consumed by both client components (Timeline, MatchTimelineEvent)
 * and Server Components (the public Match Center, the match report page).
 */
export const EVENT_META: Record<MatchEventType, { icon: LucideIcon; label: string; tone: string }> = {
  goal: { icon: GoalIcon, label: "Goal", tone: "bg-emerald-500/15 text-emerald-400" },
  penalty_goal: { icon: Target, label: "Penalty Goal", tone: "bg-emerald-500/15 text-emerald-400" },
  own_goal: { icon: GoalIcon, label: "Own Goal", tone: "bg-orange-500/15 text-orange-400" },
  yellow_card: { icon: Square, label: "Yellow Card", tone: "bg-amber-500/15 text-amber-400" },
  second_yellow: { icon: SquareStack, label: "Second Yellow", tone: "bg-red-500/15 text-red-400" },
  red_card: { icon: Square, label: "Red Card", tone: "bg-red-500/15 text-red-400" },
  substitution: { icon: ArrowLeftRight, label: "Substitution", tone: "bg-blue-500/15 text-blue-400" },
  var: { icon: MonitorPlay, label: "VAR", tone: "bg-purple-500/15 text-purple-400" },
  penalty_missed: { icon: XCircle, label: "Penalty Missed", tone: "bg-white/10 text-white/45" },
  injury: { icon: HeartPulse, label: "Injury", tone: "bg-white/10 text-white/45" },
  match_start: { icon: Play, label: "Match Start", tone: "bg-white/10 text-white/45" },
  half_time: { icon: Pause, label: "Half Time", tone: "bg-white/10 text-white/45" },
  match_resume: { icon: Play, label: "Match Resume", tone: "bg-white/10 text-white/45" },
  match_end: { icon: Flag, label: "Match End", tone: "bg-white/10 text-white/45" },
  additional_time: { icon: Hourglass, label: "Additional Time", tone: "bg-white/10 text-white/45" },
};

/** Same reasoning as EVENT_META above: a plain function, kept out of any "use client" module so Server Components can call it directly. */
export function minuteSort(a: string, b: string) {
  const parse = (m: string) => {
    const [base, extra] = m.split("+").map(Number);
    return base * 100 + (extra || 0);
  };
  return parse(a) - parse(b);
}
