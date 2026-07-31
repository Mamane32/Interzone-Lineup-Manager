import type { PlatformRole } from "@/lib/types";

const LABEL: Record<PlatformRole, string> = {
  super_admin: "Super Admin",
  admin: "Administrator",
  competition_manager: "Competition Manager",
  broadcast_operator: "Broadcast Operator",
  coach: "Coach",
  referee: "Referee",
  media: "Media",
  viewer: "Viewer",
};

export default function RoleBadge({ role }: { role: PlatformRole }) {
  return (
    <span className="inline-flex items-center rounded-full bg-brand-400/10 px-2 py-0.5 text-[11px] font-semibold text-brand-400">
      {LABEL[role]}
    </span>
  );
}
