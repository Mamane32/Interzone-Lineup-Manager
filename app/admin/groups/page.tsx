import Link from "next/link";
import { requireFoundationAccess } from "@/lib/foundation";
import { supabaseAdmin } from "@/lib/supabase-admin";
import Card from "@/components/ui/Card";
import Select from "@/components/ui/Select";
import Button from "@/components/ui/Button";
import CreateGroupButton from "@/components/foundation/CreateGroupButton";
import GroupRow from "@/components/foundation/GroupRow";
import type { CompetitionGroup, Stage } from "@/lib/types";

export const dynamic = "force-dynamic";

const ERROR_MESSAGES: Record<string, string> = {
  "missing-fields": "Stage and name are required.",
  "not-found": "That record no longer exists.",
  "save-failed": "Could not save. Please try again.",
};

export default async function GroupsPage({
  searchParams,
}: {
  searchParams: { stage?: string; status?: string; saved?: string; error?: string };
}) {
  await requireFoundationAccess();

  const admin = supabaseAdmin();
  const { data: stages } = await admin.from("stages").select("*").order("name");
  const stageList = (stages ?? []) as Stage[];
  const stagesById = new Map(stageList.map((s) => [s.id, s.name]));

  let query = admin.from("competition_groups").select("*");
  if (searchParams.stage) query = query.eq("stage_id", searchParams.stage);
  if (searchParams.status) query = query.eq("status", searchParams.status);
  const { data: groups } = await query.order("display_order", { ascending: true });
  const groupList = (groups ?? []) as CompetitionGroup[];

  const hasFilters = !!(searchParams.stage || searchParams.status);

  return (
    <div className="flex flex-col gap-6">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h1 className="font-display text-3xl font-semibold">Groups</h1>
          <p className="text-white/40">Group A, Group B, North, South, and similar splits within a stage.</p>
        </div>
        <CreateGroupButton stages={stageList} />
      </div>

      {searchParams.saved && <p className="rounded-lg bg-status-submitted/10 px-3 py-2 text-sm font-medium text-status-submitted">Saved.</p>}
      {searchParams.error && (
        <p className="rounded-lg bg-status-correction/10 px-3 py-2 text-sm font-medium text-status-correction">
          {ERROR_MESSAGES[searchParams.error] ?? "Something went wrong."}
        </p>
      )}

      <Card>
        <form className="grid gap-3 sm:grid-cols-3" method="get">
          <Select id="stage" name="stage" label="Stage" tone="dark" defaultValue={searchParams.stage ?? ""}>
            <option value="">Any stage</option>
            {stageList.map((s) => (
              <option key={s.id} value={s.id}>{s.name}</option>
            ))}
          </Select>
          <Select id="status" name="status" label="Status" tone="dark" defaultValue={searchParams.status ?? ""}>
            <option value="">Any status</option>
            <option value="active">Active</option>
            <option value="archived">Archived</option>
          </Select>
          <div className="flex items-end gap-2">
            <Button type="submit">Apply</Button>
            {hasFilters && <Link href="/admin/groups"><Button type="button" variant="ghost">Clear</Button></Link>}
          </div>
        </form>
      </Card>

      <Card className="p-0">
        {groupList.length === 0 ? (
          <div className="p-10 text-center text-white/40">{hasFilters ? "No groups match those filters." : "No groups yet."}</div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left text-sm">
              <thead className="border-b border-white/[0.08] text-xs uppercase tracking-wide text-white/40">
                <tr>
                  <th className="px-4 py-3 font-medium">Name</th>
                  <th className="px-4 py-3 font-medium">Stage</th>
                  <th className="px-4 py-3 font-medium">Status</th>
                  <th className="px-4 py-3 font-medium">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-white/[0.08]">
                {groupList.map((g) => (
                  <GroupRow key={g.id} group={g} stages={stageList} stageName={stagesById.get(g.stage_id) ?? "—"} />
                ))}
              </tbody>
            </table>
          </div>
        )}
      </Card>
    </div>
  );
}
