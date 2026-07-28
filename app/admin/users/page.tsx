import Link from "next/link";
import { requireAdmin } from "@/lib/access";
import { searchUsers } from "@/lib/iam";
import { supabaseAdmin } from "@/lib/supabase-admin";
import Card from "@/components/ui/Card";
import Input from "@/components/ui/Input";
import Select from "@/components/ui/Select";
import Button from "@/components/ui/Button";
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

  return (
    <div className="flex flex-col gap-6">
      <div>
        <h1 className="font-display text-3xl font-semibold">Users</h1>
        <p className="text-ink-muted">Platform users and their access assignments.</p>
      </div>

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

      <Card className="p-0">
        {users.length === 0 ? (
          <div className="p-10 text-center text-ink-muted">
            {hasFilters ? "No users match those filters." : "No users yet."}
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left text-sm">
              <thead className="border-b border-ink-line text-xs uppercase tracking-wide text-ink-muted">
                <tr>
                  <th className="px-4 py-3 font-medium">Name</th>
                  <th className="px-4 py-3 font-medium">Email</th>
                  <th className="px-4 py-3 font-medium">Roles</th>
                  <th className="px-4 py-3 font-medium">Status</th>
                  <th className="px-4 py-3 font-medium">Created</th>
                  <th className="px-4 py-3 font-medium">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-ink-line">
                {users.map((u) => (
                  <tr key={u.id} className="hover:bg-white/[0.03]">
                    <td className="px-4 py-3 font-medium">{u.full_name || "—"}</td>
                    <td className="px-4 py-3 text-ink-muted">{u.email}</td>
                    <td className="px-4 py-3">
                      <div className="flex flex-wrap gap-1">
                        {u.assignments.length === 0 && <span className="text-xs text-ink-muted">No assignments</span>}
                        {u.assignments.slice(0, 2).map((a) => (
                          <RoleBadge key={a.id} role={a.role_key} />
                        ))}
                        {u.assignments.length > 2 && (
                          <span className="text-xs text-ink-muted">+{u.assignments.length - 2}</span>
                        )}
                      </div>
                    </td>
                    <td className="px-4 py-3">
                      <UserStatusBadge status={u.status} />
                    </td>
                    <td className="px-4 py-3 text-xs text-ink-muted">
                      {new Date(u.created_at).toLocaleDateString()}
                    </td>
                    <td className="px-4 py-3">
                      <Link href={`/admin/users/${u.id}`} className="text-sm font-medium text-amber-signal hover:underline">
                        View
                      </Link>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
        <Pagination
          page={page}
          pageSize={pageSize}
          total={total}
          basePath="/admin/users"
          searchParams={{ q: searchParams.q, status: searchParams.status, role: searchParams.role, competition: searchParams.competition }}
        />
      </Card>
    </div>
  );
}
