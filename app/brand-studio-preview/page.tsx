import { redirect } from "next/navigation";
import { getBrandingAccess } from "@/lib/branding-permissions";
import { getPlatformBranding } from "@/lib/branding";
import PreviewClient from "@/components/brand-studio/PreviewClient";
import { PREVIEW_TABS, type PreviewTab } from "@/components/brand-studio/preview-types";

export const dynamic = "force-dynamic";

/**
 * The Brand Studio's live preview, rendered as its OWN document — loaded
 * inside an <iframe> by components/brand-studio/LivePreview.tsx, never
 * visited directly. Deliberately a top-level route (not under app/admin/**)
 * so it does NOT inherit app/admin/layout.tsx's real AdminShell chrome:
 * the Dashboard/Mobile preview tabs render their own sample AdminShell
 * (see PreviewSurface), and nesting that inside the real one would show
 * two sidebars. Being its own document is also the entire point — an
 * iframe gets its own independent viewport, so AdminShell's `lg:`
 * sidebar-vs-hamburger breakpoint (and every other responsive class)
 * evaluates against this frame's actual width instead of the browser
 * window's, which is what makes the Mobile tab reflow instead of clip.
 *
 * Same access gate as app/admin/brand-studio/page.tsx (platform-owner
 * only) — this route shows nothing sensitive beyond what that page
 * already does, but it's still real branding data and stays behind the
 * same check rather than being left open because "it's just a preview."
 */
export default async function BrandStudioPreviewPage({ searchParams }: { searchParams: { tab?: string } }) {
  const access = await getBrandingAccess();
  if (!access) redirect("/login");
  if (access.brandingRole !== "platform-owner") redirect("/admin/dashboard?error=forbidden");

  const validTabs = new Set(PREVIEW_TABS.map((t) => t.id));
  const tab: PreviewTab = validTabs.has(searchParams.tab as PreviewTab) ? (searchParams.tab as PreviewTab) : "dashboard";

  const platform = await getPlatformBranding();

  return <PreviewClient initialSaved={platform} tab={tab} />;
}
