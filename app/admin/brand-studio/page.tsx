import { redirect } from "next/navigation";
import { getBrandingAccess } from "@/lib/branding-permissions";
import { getPlatformBranding } from "@/lib/branding";
import BrandStudio from "@/components/brand-studio/BrandStudio";

export const metadata = {
  title: "Brand Studio",
};

/**
 * Route for the White-Label Branding System's Live Brand Studio
 * (Sprint 3). Sits under app/admin/**, so it already renders inside the
 * real AdminShell via app/admin/layout.tsx — no separate page chrome to
 * maintain. Gated to Platform Owners (super_admin, or admin explicitly
 * granted can_manage_platform_branding) since only that level may write
 * platform_branding; everyone else is redirected with a friendly error
 * rather than hitting a thrown permission error mid-render. Level 2
 * (Competition Administrator) branding gets its own, separate surface —
 * not this page — per the two-level permission model; see
 * lib/branding-permissions.ts.
 */
export default async function BrandStudioPage() {
  const access = await getBrandingAccess();
  if (!access) redirect("/login");
  if (access.brandingRole !== "platform-owner") {
    redirect("/admin/dashboard?error=forbidden");
  }

  const platform = await getPlatformBranding();

  return (
    <div>
      <BrandStudio initial={platform} />
    </div>
  );
}
