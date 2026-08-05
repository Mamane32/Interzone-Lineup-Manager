import AdminShell from "@/components/shell/AdminShell";
import { getProfile, requireAdmin } from "@/lib/access";
import { getPlatformBranding } from "@/lib/branding";

export default async function AdminLayout({ children }: { children: React.ReactNode }) {
  const { userId, role } = await requireAdmin();
  const [profile, platform] = await Promise.all([getProfile(userId), getPlatformBranding()]);

  return (
    <AdminShell
      user={{
        name: profile?.full_name || "GoodGrafik Administrator",
        email: profile?.email || "",
        role: role === "super_admin" ? "Super Administrator" : "Administrator",
        avatarUrl: profile?.avatar_url,
      }}
      branding={{
        orgName: platform.organizationName,
        subtitle: platform.organizationSubtitle,
        logoUrl: platform.organizationLogoUrl,
      }}
    >
      {children}
    </AdminShell>
  );
}
