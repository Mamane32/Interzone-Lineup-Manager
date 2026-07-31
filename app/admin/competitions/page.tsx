import { Building2, CheckCircle2, Trophy } from "lucide-react";
import { supabaseAdmin } from "@/lib/supabase-admin";
import { requireFoundationAccess } from "@/lib/foundation";
import PageHeader from "@/components/ui/PageHeader";
import StatCard from "@/components/ui/StatCard";
import CreateCompetitionButton from "@/components/foundation/CreateCompetitionButton";
import CompetitionsExplorer from "@/components/foundation/CompetitionsExplorer";
import type { Competition, Organization } from "@/lib/types";

// Always render on request — this page reads live data via the service-role
// Supabase client, and must never be executed or cached at build time.
export const dynamic = "force-dynamic";

const ERROR_MESSAGES: Record<string, string> = {
  "missing-name": "Name is required.",
  "duplicate-slug": "That slug is already in use for this organization — choose another.",
  "save-failed": "Could not save. Please try again.",
};

export default async function CompetitionsPage({
  searchParams,
}: {
  searchParams: { saved?: string; error?: string };
}) {
  await requireFoundationAccess();
  const supabase = supabaseAdmin();

  const [{ data: competitions }, { data: organizations }] = await Promise.all([
    supabase.from("competitions").select("*").order("created_at", { ascending: false }),
    supabase.from("organizations").select("*").order("name"),
  ]);

  const list = (competitions ?? []) as Competition[];
  const orgList = (organizations ?? []) as Organization[];
  const activeCount = list.filter((c) => (c.status ?? "active") === "active").length;
  const linkedOrgCount = new Set(list.map((c) => c.organization_id).filter(Boolean)).size;

  return (
    <div className="flex flex-col gap-6">
      <PageHeader
        eyebrow="Competition management"
        title="Competitions"
        description="Group matches and teams under a competition, and control how each one is structured."
        actions={<CreateCompetitionButton organizations={orgList} />}
      />

      {searchParams.saved && <p className="rounded-lg bg-status-submitted/10 px-3 py-2 text-sm font-medium text-status-submitted">Saved.</p>}
      {searchParams.error && (
        <p className="rounded-lg bg-status-correction/10 px-3 py-2 text-sm font-medium text-status-correction">
          {ERROR_MESSAGES[searchParams.error] ?? "Something went wrong."}
        </p>
      )}

      <div className="grid gap-4 sm:grid-cols-3">
        <StatCard label="Total competitions" value={list.length} icon={Trophy} />
        <StatCard label="Active" value={activeCount} detail={`${list.length - activeCount} archived`} icon={CheckCircle2} tone="success" />
        <StatCard label="Organizations linked" value={linkedOrgCount} icon={Building2} tone="neutral" />
      </div>

      <CompetitionsExplorer competitions={list} organizations={orgList} />
    </div>
  );
}
