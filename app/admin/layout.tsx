import AdminShell from "@/components/shell/AdminShell";
import { getProfile, requireAdmin } from "@/lib/access";

export default async function AdminLayout({ children }: { children: React.ReactNode }) {
  const { userId, role } = await requireAdmin();
  const profile = await getProfile(userId);

  return (
    <AdminShell
      user={{
        name: profile?.full_name || "GGSP Administrator",
        email: profile?.email || "",
        role: role === "super_admin" ? "Super Administrator" : "Administrator",
        avatarUrl: profile?.avatar_url,
      }}
    >
      {children}
    </AdminShell>
  );
}
