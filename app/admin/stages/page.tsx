import Link from "next/link";
import { requireFoundationAccess } from "@/lib/foundation";
import { supabaseAdmin } from "@/lib/supabase-admin";
import Card from "@/components/ui/Card";
import Select from "@/components/ui/Select";
import Button from "@/components/ui/Button";
import CreateStageButton from "@/components/foundation/CreateStageButton";
import StageRow from "@/components/foundation/StageRow";
import type { Division, Stage } from "@/lib/types";

export const dynamic = "force-dynamic";

const ERROR_MESSAGES: Record<string, string> = {
  "missing-fields": "Division and name are required.",
  "not-found": "That record no longer exists.",
  "save-failed": "Could not save. Please try again.",
};

export default async function StagesPage({
  searchParams,
}: {
  searchParams: { division?: string; status?: string; saved?: string; error?: string };
}) {
  await requireFoundationAccess();

  const admin = supabaseAdmin();
  const { data: divisions } = await admin.from("divisions").select("*").order("name");
  const divisionList = (divisions ?? []) as Division[];
  const divisionsById = new Map(divisionList.map((d) => [d.id, d.name]));

  let query = admin.from("stages").select("*");
  if (searchParams.division) query = query.eq("division_id", searchParams.division);
  if (searchParams.status) query = query.eq("status", searchParams.status);
  const { data: stages } = await query.order("display_order", { ascending: true });
  const stageList = (stages ?? []) as Stage[];

  const hasFilters = !!(searchParams.division || searchParams.status);

  return (
    <div className="flex flex-col gap-6">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h1 className="font-display text-3xl font-semibold">Stages</h1>
          <p className="text-ink-muted">Regular Season, Quarter Finals, Semi Finals, and similar phases within a division.</p>
        </div>
        <CreateStageButton divisions={divisionList} />
      </div>

      {searchParams.saved && <p className="rounded-lg bg-status-submitted/10 px-3 py-2 text-sm font-medium text-status-submitted">Saved.</p>}
      {searchParams.error && (
        <p className="rounded-lg bg-status-correction/10 px-3 py-2 text-sm font-medium text-status-correction">
          {ERROR_MESSAGES[searchParams.error] ?? "Something went wrong."}
        </p>
      )}

      <Card>
        <form className="grid gap-3 sm:grid-cols-3" method="get">
          <Select id="division" name="division" label="Division" tone="dark" defaultValue={searchParams.division ?? ""}>
            <option value="">Any division</option>
            {divisionList.map((d) => (
              <option key={d.id} value={d.id}>{d.name}</option>
            ))}
          </Select>
          <Select id="status" name="status" label="Status" tone="dark" defaultValue={searchParams.status ?? ""}>
            <option value="">Any status</option>
            <option value="active">Active</option>
            <option value="archived">Archived</option>
          </Select>
          <div className="flex items-end gap-2">
            <Button type="submit">Apply</Button>
            {hasFilters && <Link href="/admin/stages"><Button type="button" variant="ghost">Clear</Button></Link>}
          </div>
        </form>
      </Card>

      <Card className="p-0">
        {stageList.length === 0 ? (
          <div className="p-10 text-center text-ink-muted">{hasFilters ? "No stages match those filters." : "No stages yet."}</div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left text-sm">
              <thead className="border-b border-ink-line text-xs uppercase tracking-wide text-ink-muted">
                <tr>
                  <th className="px-4 py-3 font-medium">Name</th>
                  <th className="px-4 py-3 font-medium">Division</th>
                  <th className="px-4 py-3 font-medium">Type</th>
                  <th className="px-4 py-3 font-medium">Status</th>
                  <th className="px-4 py-3 font-medium">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-ink-line">
                {stageList.map((s) => (
                  <StageRow key={s.id} stage={s} divisions={divisionList} divisionName={divisionsById.get(s.division_id) ?? "—"} />
                ))}
              </tbody>
            </table>
          </div>
        )}
      </Card>
    </div>
  );
}
