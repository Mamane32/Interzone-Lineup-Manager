import type { LineupStatus } from "@/lib/types";

const config: Record<LineupStatus, { label: string; dot: string; text: string }> = {
  submitted: { label: "Submitted", dot: "bg-status-submitted", text: "text-status-submitted" },
  waiting: { label: "Waiting", dot: "bg-status-waiting", text: "text-status-waiting" },
  needs_correction: {
    label: "Needs Correction",
    dot: "bg-status-correction",
    text: "text-status-correction",
  },
};

export default function StatusBadge({ status }: { status: LineupStatus }) {
  const c = config[status];
  return (
    <span className={`inline-flex items-center gap-2 text-sm font-medium ${c.text}`}>
      <span className={`h-2.5 w-2.5 rounded-full ${c.dot}`} />
      {c.label}
    </span>
  );
}
