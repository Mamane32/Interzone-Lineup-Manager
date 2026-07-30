import { Activity, CalendarDays, LayoutDashboard, Sparkles, Users2 } from "lucide-react";
import AppShell, { type ShellNavGroup } from "@/components/shell/AppShell";
import EmptyState from "@/components/ui/EmptyState";
import PageHeader from "@/components/ui/PageHeader";
import StatCard from "@/components/ui/StatCard";
import type { Profile } from "@/lib/types";

const WORKSPACE_NAVIGATION: ShellNavGroup[] = [
  {
    label: "Workspace",
    items: [
      { href: "#overview", label: "Overview", icon: LayoutDashboard },
      { href: "#activity", label: "Activity", icon: Activity },
      { href: "#calendar", label: "Schedule", icon: CalendarDays },
    ],
  },
];

export default function ComingSoonWorkspace({
  roleLabel,
  profile,
}: {
  roleLabel: string;
  profile: Profile | null;
}) {
  return (
    <AppShell
      nav={WORKSPACE_NAVIGATION}
      workspaceLabel={`${roleLabel} Workspace`}
      user={{
        name: profile?.full_name || roleLabel,
        email: profile?.email || "",
        role: roleLabel,
      }}
    >
      <PageHeader
        eyebrow="Role workspace"
        title={`Welcome to your ${roleLabel} workspace`}
        description="The shared GGSP application framework is ready. Business capabilities will be activated through the approved roadmap."
      />
      <div className="grid gap-4 sm:grid-cols-3">
        <StatCard label="Assigned workspace" value="1" detail="Verified access scope" icon={Users2} tone="brand" />
        <StatCard label="Open activities" value="0" detail="Nothing needs attention" icon={Activity} tone="success" />
        <StatCard label="Upcoming events" value="0" detail="Module activation pending" icon={CalendarDays} tone="neutral" />
      </div>
      <div className="mt-6" id="overview">
        <EmptyState
          icon={Sparkles}
          title="Your workspace foundation is ready"
          description="Navigation, notifications, profile controls, responsive layouts, and shared states are in place. Role-specific business modules will arrive in future approved sprints."
        />
      </div>
    </AppShell>
  );
}
