import Link from "next/link";
import { requireFoundationAccess, searchSeasons } from "@/lib/foundation";
import { supabaseAdmin } from "@/lib/supabase-admin";
import Card from "@/components/ui/Card";
import Input from "@/components/ui/Input";
import Select from "@/components/ui/Select";
import Button from "@/components/ui/Button";
import Pagination from "@/components/iam/Pagination";
import CreateSeasonButton from "@/components/foundation/CreateSeasonButton";
import SeasonRow from "@/components/foundation/SeasonRow";
import type { Competition } from "@/lib/types";

export const dynamic = "force-dynamic";

const ERROR_MESSAGES: Record<string, string> = {
  "missing-fields": "Competition and name are required.",
  "not-found": "That record no longer exists.",
  "save-failed": "Could not save. Please try again.",
};

export default async function SeasonsPage({
  searchParams,
}: {
  searchParams: { q?: string; competition?: string; status?: string; page?: string; saved?: string; error?: string };
}) {
  await requireFoundationAccess();

  const admin = supabaseAdmin();
  const { data: competitions } = await admin.from("competitions").select("*").order("name");
  const competitionList = (competitions ?? []) as Competition[];
  const competitionsById = new Map(competitionList.map((c) => [c.id, c.name]));

  const { seasons: seasonList, total, page, pageSize } = await searchSeasons({
    q: searchParams.q,
    status: (searchParams.status as "active" | "archived") || undefined,
    competitionId: searchParams.competition || undefined,
    page: searchParams.page ? Number(searchParams.page) : 1,
  });

  const hasFilters = !!(searchParams.q || searchParams.competition || searchParams.status);

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
        <form className="grid gap-3 sm:grid-cols-4" method="get">
          <Input id="q" name="q" label="Search" placeholder="Season name" defaultValue={searchParams.q ?? ""} />
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
        <Pagination
          page={page}
          pageSize={pageSize}
          total={total}
          basePath="/admin/seasons"
          searchParams={{ q: searchParams.q, competition: searchParams.competition, status: searchParams.status }}
        />
      </Card>
    </div>
  );
}
