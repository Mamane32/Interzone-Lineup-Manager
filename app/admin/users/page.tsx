import Link from "next/link";
import { Users2 } from "lucide-react";
import { requireAdmin } from "@/lib/access";
import { searchUsers, type ProfileWithAssignments } from "@/lib/iam";
import { supabaseAdmin } from "@/lib/supabase-admin";
import Card from "@/components/ui/Card";
import Input from "@/components/ui/Input";
import Select from "@/components/ui/Select";
import Button from "@/components/ui/Button";
import PageHeader from "@/components/ui/PageHeader";
import DataTable, { type DataTableColumn } from "@/components/ui/DataTable";
import UserStatusBadge from "@/components/iam/StatusBadge";
import RoleBadge from "@/components/iam/RoleBadge";
import Pagination from "@/components/iam/Pagination";
import { PLATFORM_ROLES, ACCESS_STATUSES } from "@/lib/validation";
import type { AccessStatus, Competition, PlatformRole } from "@/lib/types";

export const dynamic = "force-dynamic";

export default async function UsersPage({
  searchParams,
}: {
  searchParams: { q?: string; status?: string; role?: string; competition?: string; page?: string };
}) {
  await requireAdmin();

  const admin = supabaseAdmin();
  const { data: competitions } = await admin.from("competitions").select("*").order("name");

  const { users, total, page, pageSize } = await searchUsers({
    q: searchParams.q,
    status: (searchParams.status as AccessStatus) || undefined,
    roleKey: (searchParams.role as PlatformRole) || undefined,
    competitionId: searchParams.competition || undefined,
    page: searchParams.page ? Number(searchParams.page) : 1,
  });

  const hasFilters = !!(searchParams.q || searchParams.status || searchParams.role || searchParams.competition);

  const columns: DataTableColumn<ProfileWithAssignments>[] = [
    {
      key: "name",
      header: "User",
      cardRole: "title",
      render: (u) => (
        <div>
          <p className="font-medium text-white">{u.full_name || "—"}</p>
          <p className="text-xs text-white/35">{u.email}</p>
        </div>
      ),
    },
    {
      key: "roles",
      header: "Roles",
      render: (u) => (
        <div className="flex flex-wrap justify-end gap-1 md:justify-start">
          {u.assignments.length === 0 && <span className="text-xs text-white/40">No assignments</span>}
          {u.assignments.slice(0, 2).map((a) => (
            <RoleBadge key={a.id} role={a.role_key} />
          ))}
          {u.assignments.length > 2 && <span className="text-xs text-white/40">+{u.assignments.length - 2}</span>}
        </div>
      ),
    },
    { key: "status", header: "Status", render: (u) => <UserStatusBadge status={u.status} /> },
    {
      key: "created",
      header: "Created",
      render: (u) => <span className="text-xs text-white/40">{new Date(u.created_at).toLocaleDateString()}</span>,
    },
    {
      key: "actions",
      header: "",
      cardRole: "actions",
      className: "text-right",
      render: (u) => (
        <Link href={`/admin/users/${u.id}`} className="text-sm font-medium text-brand-400 hover:underline">
          View
        </Link>
      ),
    },
  ];

  return (
    <div className="flex flex-col gap-6">
      <PageHeader eyebrow="Identity & access" title="Users" description="Platform users and their access assignments." />

      <Card>
        <form className="grid gap-3 sm:grid-cols-2 lg:grid-cols-5" method="get">
          <Input id="q" name="q" label="Search" placeholder="Name or email" defaultValue={searchParams.q ?? ""} />
          <Select id="role" name="role" label="Role" tone="dark" defaultValue={searchParams.role ?? ""}>
            <option value="">Any role</option>
            {PLATFORM_ROLES.map((r) => (
              <option key={r} value={r}>
                {r.replace("_", " ")}
              </option>
            ))}
          </Select>
          <Select id="status" name="status" label="Status" tone="dark" defaultValue={searchParams.status ?? ""}>
            <option value="">Any status</option>
            {ACCESS_STATUSES.map((s) => (
              <option key={s} value={s}>
                {s}
              </option>
            ))}
          </Select>
          <Select id="competition" name="competition" label="Competition" tone="dark" defaultValue={searchParams.competition ?? ""}>
            <option value="">Any competition</option>
            {((competitions ?? []) as Competition[]).map((c) => (
              <option key={c.id} value={c.id}>
                {c.name}
              </option>
            ))}
          </Select>
          <div className="flex items-end gap-2">
            <Button type="submit">Apply</Button>
            {hasFilters && (
              <Link href="/admin/users">
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
        rows={users}
        rowKey={(u) => u.id}
        empty={{
          title: hasFilters ? "No matches" : "No users yet",
          description: hasFilters ? "No users match those filters." : "Invited users will appear here.",
          icon: Users2,
        }}
      />
      {total > 0 && (
        <Card className="p-0">
          <Pagination
            page={page}
            pageSize={pageSize}
            total={total}
            basePath="/admin/users"
            searchParams={{ q: searchParams.q, status: searchParams.status, role: searchParams.role, competition: searchParams.competition }}
          />
        </Card>
      )}
    </div>
  );
}
