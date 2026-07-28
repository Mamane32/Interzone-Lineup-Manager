import { supabaseAdmin } from "@/lib/supabase-admin";
import { requireFoundationAccess } from "@/lib/foundation";
import Card from "@/components/ui/Card";
import CreateCompetitionButton from "@/components/foundation/CreateCompetitionButton";
import CompetitionRow from "@/components/foundation/CompetitionRow";
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
  const orgsById = new Map(orgList.map((o) => [o.id, o.name]));

  return (
    <div className="flex flex-col gap-6">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h1 className="font-display text-3xl font-semibold">Competitions</h1>
          <p className="text-ink-muted">Group matches and teams under a competition.</p>
        </div>
        <CreateCompetitionButton organizations={orgList} />
      </div>

      {searchParams.saved && <p className="rounded-lg bg-status-submitted/10 px-3 py-2 text-sm font-medium text-status-submitted">Saved.</p>}
      {searchParams.error && (
        <p className="rounded-lg bg-status-correction/10 px-3 py-2 text-sm font-medium text-status-correction">
          {ERROR_MESSAGES[searchParams.error] ?? "Something went wrong."}
        </p>
      )}

      <Card className="p-0">
        {list.length === 0 ? (
          <div className="p-10 text-center text-ink-muted">No competitions yet.</div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left text-sm">
              <thead className="border-b border-ink-line text-xs uppercase tracking-wide text-ink-muted">
                <tr>
                  <th className="px-4 py-3 font-medium">Name</th>
                  <th className="px-4 py-3 font-medium">Organization</th>
                  <th className="px-4 py-3 font-medium">Type</th>
                  <th className="px-4 py-3 font-medium">Status</th>
                  <th className="px-4 py-3 font-medium">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-ink-line">
                {list.map((c) => (
                  <CompetitionRow key={c.id} competition={c} organizations={orgList} organizationName={(c.organization_id && orgsById.get(c.organization_id)) || "—"} />
                ))}
              </tbody>
            </table>
          </div>
        )}
      </Card>
    </div>
  );
}
