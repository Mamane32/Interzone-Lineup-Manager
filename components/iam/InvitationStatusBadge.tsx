import type { InvitationStatus } from "@/lib/types";

const STYLE: Record<InvitationStatus, string> = {
  pending: "bg-status-waiting/10 text-status-waiting",
  accepted: "bg-status-submitted/10 text-status-submitted",
  expired: "bg-white/5 text-white/40",
  revoked: "bg-status-correction/10 text-status-correction",
  archived: "bg-white/5 text-white/30",
};

const LABEL: Record<InvitationStatus, string> = {
  pending: "Pending",
  accepted: "Accepted",
  expired: "Expired",
  revoked: "Revoked",
  archived: "Archived",
};

export default function InvitationStatusBadge({ status }: { status: InvitationStatus }) {
  return (
    <span className={`inline-flex items-center rounded-full px-2 py-0.5 text-[11px] font-semibold ${STYLE[status]}`}>
      {LABEL[status]}
    </span>
  );
}
