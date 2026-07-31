import Link from "next/link";
import { MapPin } from "lucide-react";
import { requireFoundationAccess, searchVenues } from "@/lib/foundation";
import { supabaseAdmin } from "@/lib/supabase-admin";
import Card from "@/components/ui/Card";
import Input from "@/components/ui/Input";
import Select from "@/components/ui/Select";
import Button from "@/components/ui/Button";
import PageHeader from "@/components/ui/PageHeader";
import DataTable, { type DataTableColumn } from "@/components/ui/DataTable";
import UserStatusBadge from "@/components/iam/StatusBadge";
import Pagination from "@/components/iam/Pagination";
import CreateVenueButton from "@/components/foundation/CreateVenueButton";
import VenueRow from "@/components/foundation/VenueRow";
import type { Organization, Venue } from "@/lib/types";

export const dynamic = "force-dynamic";

const ERROR_MESSAGES: Record<string, string> = {
  "missing-name": "Name is required.",
  "duplicate-slug": "That slug is already in use for this organization — choose another.",
  "save-failed": "Could not save. Please try again.",
  "not-found": "That venue no longer exists.",
};

export default async function VenuesPage({
  searchParams,
}: {
  searchParams: { q?: string; status?: string; organization?: string; page?: string; saved?: string; error?: string };
}) {
  await requireFoundationAccess();

  const admin = supabaseAdmin();
  const { data: organizations } = await admin.from("organizations").select("*").order("name");
  const orgList = (organizations ?? []) as Organization[];
  const orgsById = new Map(orgList.map((o) => [o.id, o.name]));

  const { venues, total, page, pageSize } = await searchVenues({
    q: searchParams.q,
    status: (searchParams.status as "active" | "archived") || undefined,
    organizationId: searchParams.organization || undefined,
    page: searchParams.page ? Number(searchParams.page) : 1,
  });

  const hasFilters = !!(searchParams.q || searchParams.status || searchParams.organization);

  const columns: DataTableColumn<Venue>[] = [
    { key: "name", header: "Venue", cardRole: "title", render: (v) => <span className="font-medium text-white">{v.name}</span> },
    {
      key: "location",
      header: "Location",
      render: (v) => <span className="text-white/60">{[v.city, v.country].filter(Boolean).join(", ") || "—"}</span>,
    },
    {
      key: "organization",
      header: "Organization",
      render: (v) => <span className="text-white/60">{(v.organization_id && orgsById.get(v.organization_id)) || "—"}</span>,
    },
    { key: "capacity", header: "Capacity", render: (v) => <span className="text-white/60">{v.capacity ?? "—"}</span> },
    { key: "status", header: "Status", render: (v) => <UserStatusBadge status={v.status} /> },
    {
      key: "actions",
      header: "",
      cardRole: "actions",
      className: "text-right",
      render: (v) => (
        <div className="flex justify-end">
          <VenueRow venue={v} organizations={orgList} organizationName={(v.organization_id && orgsById.get(v.organization_id)) || "—"} />
        </div>
      ),
    },
  ];

  return (
    <div className="flex flex-col gap-6">
      <PageHeader
        eyebrow="Platform hierarchy"
        title="Venues"
        description="Grounds and stadiums — future Matches will reference these."
        actions={<CreateVenueButton organizations={orgList} />}
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
        <form className="grid gap-3 sm:grid-cols-4" method="get">
          <Input id="q" name="q" label="Search" placeholder="Name or city" defaultValue={searchParams.q ?? ""} />
          <Select id="organization" name="organization" label="Organization" tone="dark" defaultValue={searchParams.organization ?? ""}>
            <option value="">Any organization</option>
            {orgList.map((o) => (
              <option key={o.id} value={o.id}>
                {o.name}
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
              <Link href="/admin/venues">
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
        rows={venues}
        rowKey={(v) => v.id}
        empty={{
          title: hasFilters ? "No matches" : "No venues yet",
          description: hasFilters ? "No venues match those filters." : "Add your first venue to start tying matches to real grounds.",
          icon: MapPin,
        }}
      />
      {total > 0 && (
        <Card className="p-0">
          <Pagination
            page={page}
            pageSize={pageSize}
            total={total}
            basePath="/admin/venues"
            searchParams={{ q: searchParams.q, status: searchParams.status, organization: searchParams.organization }}
          />
        </Card>
      )}
    </div>
  );
}
