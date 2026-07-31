import Link from "next/link";
import { requireFoundationAccess } from "@/lib/foundation";
import { supabaseAdmin } from "@/lib/supabase-admin";
import Card from "@/components/ui/Card";
import Select from "@/components/ui/Select";
import Button from "@/components/ui/Button";
import CreateSeasonButton from "@/components/foundation/CreateSeasonButton";
import SeasonRow from "@/components/foundation/SeasonRow";
import type { Competition, Season } from "@/lib/types";

export const dynamic = "force-dynamic";

const ERROR_MESSAGES: Record<string, string> = {
  "missing-fields": "Competition and name are required.",
  "not-found": "That record no longer exists.",
  "save-failed": "Could not save. Please try again.",
};

export default async function SeasonsPage({
  searchParams,
}: {
  searchParams: { competition?: string; status?: string; saved?: string; error?: string };
}) {
  await requireFoundationAccess();

  const admin = supabaseAdmin();
  const { data: competitions } = await admin.from("competitions").select("*").order("name");
  const competitionList = (competitions ?? []) as Competition[];
  const competitionsById = new Map(competitionList.map((c) => [c.id, c.name]));

  let query = admin.from("seasons").select("*");
  if (searchParams.competition) query = query.eq("competition_id", searchParams.competition);
  if (searchParams.status) query = query.eq("status", searchParams.status);
  const { data: seasons } = await query.order("created_at", { ascending: false });
  const seasonList = (seasons ?? []) as Season[];

  const hasFilters = !!(searchParams.competition || searchParams.status);

  return (
    <div className="flex flex-col gap-6">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h1 className="font-display text-3xl font-semibold">Seasons</h1>
          <p className="text-white/40">Exactly one active season per competition, enforced by the database.</p>
        </div>
        <CreateSeasonButton competitions={competitionList} />
      </div>

      {searchParams.saved && (
        <p className="rounded-lg bg-status-submitted/10 px-3 py-2 text-sm font-medium text-status-submitted">Saved.</p>
      )}
      {searchParams.error && (
        <p className="rounded-lg bg-status-correction/10 px-3 py-2 text-sm font-medium text-status-correction">
          {ERROR_MESSAGES[searchParams.error] ?? "Something went wrong."}
        </p>
      )}

      <Card>
        <form className="grid gap-3 sm:grid-cols-3" method="get">
          <Select id="competition" name="competition" label="Competition" tone="dark" defaultValue={searchParams.competition ?? ""}>
            <option value="">Any competition</option>
            {competitionList.map((c) => (
              <option key={c.id} value={c.id}>
                {c.name}
              </option>
            ))}
          </Select>
          <Select id="status" name="status" label="Status" tone="dark" defaultValue={searchParams.status ?? ""}>
            <option value="">Any status</option>
            <option value="active">Active</option>
            <option value="archived">Archived</option>
          </Select>
          <div className="flex items-end gap-2">
            <Button type="submit">Apply</Button>
            {hasFilters && (
              <Link href="/admin/seasons">
                <Button type="button" variant="ghost">
                  Clear
                </Button>
              </Link>
            )}
          </div>
        </form>
      </Card>

      <Card className="p-0">
        {seasonList.length === 0 ? (
          <div className="p-10 text-center text-white/40">
            {hasFilters ? "No seasons match those filters." : "No seasons yet."}
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left text-sm">
              <thead className="border-b border-white/[0.08] text-xs uppercase tracking-wide text-white/40">
                <tr>
                  <th className="px-4 py-3 font-medium">Name</th>
                  <th className="px-4 py-3 font-medium">Competition</th>
                  <th className="px-4 py-3 font-medium">Year</th>
                  <th className="px-4 py-3 font-medium">Status</th>
                  <th className="px-4 py-3 font-medium">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-white/[0.08]">
                {seasonList.map((s) => (
                  <SeasonRow key={s.id} season={s} competitions={competitionList} competitionName={competitionsById.get(s.competition_id) ?? "—"} />
                ))}
              </tbody>
            </table>
          </div>
        )}
      </Card>
    </div>
  );
}
