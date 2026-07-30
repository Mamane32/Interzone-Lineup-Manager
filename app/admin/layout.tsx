import AppShell from "@/components/shell/AppShell";
import { ADMIN_NAVIGATION } from "@/components/shell/admin-navigation";
import { getProfile, requireAdmin } from "@/lib/access";

export default async function AdminLayout({ children }: { children: React.ReactNode }) {
  const { userId, role } = await requireAdmin();
  const profile = await getProfile(userId);

  return (
    <AppShell
      nav={ADMIN_NAVIGATION}
      workspaceLabel="Platform Administration"
      user={{
        name: profile?.full_name || "GGSP Administrator",
        email: profile?.email || "",
        role: role === "super_admin" ? "Super Administrator" : "Administrator",
      }}
    >
      {children}
    </AppShell>
  );
}
