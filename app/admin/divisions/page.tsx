import Link from "next/link";
import { requireFoundationAccess, searchDivisions } from "@/lib/foundation";
import { supabaseAdmin } from "@/lib/supabase-admin";
import Card from "@/components/ui/Card";
import Input from "@/components/ui/Input";
import Select from "@/components/ui/Select";
import Button from "@/components/ui/Button";
import Pagination from "@/components/iam/Pagination";
import CreateDivisionButton from "@/components/foundation/CreateDivisionButton";
import DivisionRow from "@/components/foundation/DivisionRow";
import type { Season } from "@/lib/types";

export const dynamic = "force-dynamic";

const ERROR_MESSAGES: Record<string, string> = {
  "missing-fields": "Season and name are required.",
  "not-found": "That record no longer exists.",
  "save-failed": "Could not save. Please try again.",
};

export default async function DivisionsPage({
  searchParams,
}: {
  searchParams: { q?: string; season?: string; status?: string; page?: string; saved?: string; error?: string };
}) {
  await requireFoundationAccess();

  const admin = supabaseAdmin();
  const { data: seasons } = await admin.from("seasons").select("*").order("name");
  const seasonList = (seasons ?? []) as Season[];
  const seasonsById = new Map(seasonList.map((s) => [s.id, s.name]));

  const { divisions: divisionList, total, page, pageSize } = await searchDivisions({
    q: searchParams.q,
    status: (searchParams.status as "active" | "archived") || undefined,
    seasonId: searchParams.season || undefined,
    page: searchParams.page ? Number(searchParams.page) : 1,
  });

  const hasFilters = !!(searchParams.q || searchParams.season || searchParams.status);

  return (
    <div className="flex flex-col gap-6">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h1 className="font-display text-3xl font-semibold">Divisions</h1>
          <p className="text-white/40">Senior, Women, Veterans, U23, and similar splits within a season.</p>
        </div>
        <CreateDivisionButton seasons={seasonList} />
      </div>

      {searchParams.saved && <p className="rounded-lg bg-status-submitted/10 px-3 py-2 text-sm font-medium text-status-submitted">Saved.</p>}
      {searchParams.error && (
        <p className="rounded-lg bg-status-correction/10 px-3 py-2 text-sm font-medium text-status-correction">
          {ERROR_MESSAGES[searchParams.error] ?? "Something went wrong."}
        </p>
      )}

      <Card>
        <form className="grid gap-3 sm:grid-cols-4" method="get">
          <Input id="q" name="q" label="Search" placeholder="Name or abbreviation" defaultValue={searchParams.q ?? ""} />
          <Select id="season" name="season" label="Season" tone="dark" defaultValue={searchParams.season ?? ""}>
            <option value="">Any season</option>
            {seasonList.map((s) => (
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
            {hasFilters && <Link href="/admin/divisions"><Button type="button" variant="ghost">Clear</Button></Link>}
          </div>
        </form>
      </Card>

      <Card className="p-0">
        {divisionList.length === 0 ? (
          <div className="p-10 text-center text-white/40">{hasFilters ? "No divisions match those filters." : "No divisions yet."}</div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left text-sm">
              <thead className="border-b border-white/[0.08] text-xs uppercase tracking-wide text-white/40">
                <tr>
                  <th className="px-4 py-3 font-medium">Name</th>
                  <th className="px-4 py-3 font-medium">Season</th>
                  <th className="px-4 py-3 font-medium">Abbr.</th>
                  <th className="px-4 py-3 font-medium">Status</th>
                  <th className="px-4 py-3 font-medium">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-white/[0.08]">
                {divisionList.map((d) => (
                  <DivisionRow key={d.id} division={d} seasons={seasonList} seasonName={seasonsById.get(d.season_id) ?? "—"} />
                ))}
              </tbody>
            </table>
          </div>
        )}
        <Pagination
          page={page}
          pageSize={pageSize}
          total={total}
          basePath="/admin/divisions"
          searchParams={{ q: searchParams.q, season: searchParams.season, status: searchParams.status }}
        />
      </Card>
    </div>
  );
}
