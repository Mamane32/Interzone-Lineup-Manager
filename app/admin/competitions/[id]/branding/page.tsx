import { notFound, redirect } from "next/navigation";
import { supabaseAdmin } from "@/lib/supabase-admin";
import { getBrandingAccess } from "@/lib/branding-permissions";
import { getPlatformBranding, getCompetitionBranding } from "@/lib/branding";
import CompetitionBrandStudio from "@/components/brand-studio/CompetitionBrandStudio";
import type { Competition } from "@/lib/types";

export const metadata = {
  title: "Competition Branding",
};

// Always render on request — reads live data via the service-role client.
export const dynamic = "force-dynamic";

/**
 * Level 2 (Competition Administrator) Brand Studio route. Deliberately
 * its own dedicated page rather than a tab inside CompetitionRow.tsx's
 * Drawer — same precedent as Level 1's /admin/brand-studio, and a live
 * preview needs more room than a slide-over drawer gives it.
 *
 * View is available to anyone who can already reach the Competitions
 * list (super_admin/admin/competition_manager — see
 * lib/foundation.ts's requireFoundationAccess) *except* a competition
 * manager viewing a competition they don't hold an assignment for, which
 * is refused entirely rather than shown read-only — unlike Level 1 (one
 * shared platform row everyone can see), a competition's branding is
 * scoped, tenant-sensitive data. Editing is gated separately per-field
 * save by requireCompetitionBrandingWrite (also re-checked here so the
 * page can pass `canEdit` down without duplicating that rule).
 */
export default async function CompetitionBrandingPage({ params }: { params: { id: string } }) {
  const access = await getBrandingAccess();
  if (!access) redirect("/login");

  const isPlatformOwner = access.brandingRole === "platform-owner";
  const isScopedCompetitionAdmin = access.brandingRole === "competition-admin" && access.competitionIds.includes(params.id);
  if (!isPlatformOwner && access.brandingRole === "competition-admin" && !isScopedCompetitionAdmin) {
    redirect("/admin/competitions?error=forbidden");
  }

  const supabase = supabaseAdmin();
  const { data: competition } = await supabase.from("competitions").select("id, name").eq("id", params.id).maybeSingle();
  if (!competition) notFound();

  const [platform, competitionBranding] = await Promise.all([getPlatformBranding(), getCompetitionBranding(params.id)]);
  if (!competitionBranding) notFound();

  return (
    <div>
      <CompetitionBrandStudio
        competitionId={params.id}
        competitionLabel={(competition as Pick<Competition, "id" | "name">).name}
        initial={competitionBranding}
        platform={platform}
        canEdit={isPlatformOwner || isScopedCompetitionAdmin}
      />
    </div>
  );
}
