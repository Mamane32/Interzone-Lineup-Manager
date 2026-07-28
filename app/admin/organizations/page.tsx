import Link from "next/link";
import { requireFoundationAccess, searchOrganizations } from "@/lib/foundation";
import Card from "@/components/ui/Card";
import Input from "@/components/ui/Input";
import Select from "@/components/ui/Select";
import Button from "@/components/ui/Button";
import Pagination from "@/components/iam/Pagination";
import CreateOrganizationButton from "@/components/foundation/CreateOrganizationButton";
import OrganizationRow from "@/components/foundation/OrganizationRow";

export const dynamic = "force-dynamic";

const ERROR_MESSAGES: Record<string, string> = {
  "missing-name": "Name is required.",
  "duplicate-slug": "That slug is already in use — choose another.",
  "save-failed": "Could not save. Please try again.",
  "not-found": "That organization no longer exists.",
};

export default async function OrganizationsPage({
  searchParams,
}: {
  searchParams: { q?: string; status?: string; page?: string; saved?: string; error?: string };
}) {
  await requireFoundationAccess();

  const { organizations, total, page, pageSize } = await searchOrganizations({
    q: searchParams.q,
    status: (searchParams.status as "active" | "archived") || undefined,
    page: searchParams.page ? Number(searchParams.page) : 1,
  });

  const hasFilters = !!(searchParams.q || searchParams.status);

  return (
    <div className="flex flex-col gap-6">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h1 className="font-display text-3xl font-semibold">Organizations</h1>
          <p className="text-ink-muted">The top of the platform hierarchy — Interzone is one of these, not a special case.</p>
        </div>
        <CreateOrganizationButton />
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
          <Input id="q" name="q" label="Search" placeholder="Name, short name, or slug" defaultValue={searchParams.q ?? ""} />
          <Select id="status" name="status" label="Status" tone="dark" defaultValue={searchParams.status ?? ""}>
            <option value="">Any status</option>
            <option value="active">Active</option>
            <option value="archived">Archived</option>
          </Select>
          <div className="flex items-end gap-2">
            <Button type="submit">Apply</Button>
            {hasFilters && (
              <Link href="/admin/organizations">
                <Button type="button" variant="ghost">
                  Clear
                </Button>
              </Link>
            )}
          </div>
        </form>
      </Card>

      <Card className="p-0">
        {organizations.length === 0 ? (
          <div className="p-10 text-center text-ink-muted">
            {hasFilters ? "No organizations match those filters." : "No organizations yet."}
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left text-sm">
              <thead className="border-b border-ink-line text-xs uppercase tracking-wide text-ink-muted">
                <tr>
                  <th className="px-4 py-3 font-medium">Name</th>
                  <th className="px-4 py-3 font-medium">Short name</th>
                  <th className="px-4 py-3 font-medium">Slug</th>
                  <th className="px-4 py-3 font-medium">Location</th>
                  <th className="px-4 py-3 font-medium">Status</th>
                  <th className="px-4 py-3 font-medium">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-ink-line">
                {organizations.map((org) => (
                  <OrganizationRow key={org.id} org={org} />
                ))}
              </tbody>
            </table>
          </div>
        )}
        <Pagination
          page={page}
          pageSize={pageSize}
          total={total}
          basePath="/admin/organizations"
          searchParams={{ q: searchParams.q, status: searchParams.status }}
        />
      </Card>
    </div>
  );
}
