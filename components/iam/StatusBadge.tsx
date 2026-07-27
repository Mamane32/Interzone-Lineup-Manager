import type { AccessStatus } from "@/lib/types";

const STYLE: Record<AccessStatus, string> = {
  invited: "bg-blue-500/10 text-blue-400",
  active: "bg-status-submitted/10 text-status-submitted",
  suspended: "bg-status-waiting/10 text-status-waiting",
  disabled: "bg-status-correction/10 text-status-correction",
  archived: "bg-white/5 text-ink-muted",
};

const LABEL: Record<AccessStatus, string> = {
  invited: "Invited",
  active: "Active",
  suspended: "Suspended",
  disabled: "Disabled",
  archived: "Archived",
};

export default function UserStatusBadge({ status }: { status: AccessStatus }) {
  return (
    <span className={`inline-flex items-center rounded-full px-2 py-0.5 text-[11px] font-semibold ${STYLE[status]}`}>
      {LABEL[status]}
    </span>
  );
}
