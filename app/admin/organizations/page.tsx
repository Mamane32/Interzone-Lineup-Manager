import Link from "next/link";
import { Building2 } from "lucide-react";
import { requireFoundationAccess, searchOrganizations } from "@/lib/foundation";
import Card from "@/components/ui/Card";
import Input from "@/components/ui/Input";
import Select from "@/components/ui/Select";
import Button from "@/components/ui/Button";
import PageHeader from "@/components/ui/PageHeader";
import DataTable, { type DataTableColumn } from "@/components/ui/DataTable";
import UserStatusBadge from "@/components/iam/StatusBadge";
import Pagination from "@/components/iam/Pagination";
import CreateOrganizationButton from "@/components/foundation/CreateOrganizationButton";
import OrganizationRow from "@/components/foundation/OrganizationRow";
import type { Organization } from "@/lib/types";

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

  const columns: DataTableColumn<Organization>[] = [
    {
      key: "name",
      header: "Organization",
      cardRole: "title",
      render: (org) => (
        <div>
          <p className="font-medium text-white">{org.name}</p>
          {org.short_name && <p className="text-xs text-white/35">{org.short_name}</p>}
        </div>
      ),
    },
    { key: "slug", header: "Slug", render: (org) => <span className="text-xs text-white/40">{org.slug}</span> },
    {
      key: "location",
      header: "Location",
      render: (org) => <span className="text-white/60">{[org.city, org.country].filter(Boolean).join(", ") || "—"}</span>,
    },
    { key: "status", header: "Status", render: (org) => <UserStatusBadge status={org.status} /> },
    {
      key: "actions",
      header: "",
      cardRole: "actions",
      className: "text-right",
      render: (org) => (
        <div className="flex justify-end">
          <OrganizationRow org={org} />
        </div>
      ),
    },
  ];

  return (
    <div className="flex flex-col gap-6">
      <PageHeader
        eyebrow="Platform hierarchy"
        title="Organizations"
        description="The top of the platform hierarchy — Interzone is one of these, not a special case."
        actions={<CreateOrganizationButton />}
      />

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

      <DataTable
        columns={columns}
        rows={organizations}
        rowKey={(org) => org.id}
        empty={{
          title: hasFilters ? "No matches" : "No organizations yet",
          description: hasFilters ? "No organizations match those filters." : "Create your first organization to start building the platform hierarchy.",
          icon: Building2,
        }}
      />
      {total > 0 && (
        <Card className="p-0">
          <Pagination
            page={page}
            pageSize={pageSize}
            total={total}
            basePath="/admin/organizations"
            searchParams={{ q: searchParams.q, status: searchParams.status }}
          />
        </Card>
      )}
    </div>
  );
}
