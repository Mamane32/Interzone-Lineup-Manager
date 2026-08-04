import { requireAdmin } from "@/lib/access";
import { supabaseAdmin } from "@/lib/supabase-admin";
import Card from "@/components/ui/Card";
import Input from "@/components/ui/Input";
import Select from "@/components/ui/Select";
import Button from "@/components/ui/Button";
import Pagination from "@/components/iam/Pagination";
import type { AuditLogEntry, Profile } from "@/lib/types";

export const dynamic = "force-dynamic";

const PAGE_SIZE = 30;

const ACTIONS = [
  "user.invited",
  "user.activated",
  "user.suspended",
  "user.disabled",
  "user.archived",
  "user.profile_updated",
  "invitation.resent",
  "invitation.revoked",
  "access.assignment_created",
  "access.assignment_activated",
  "access.assignment_revoked",
  "role.updated",
];

export default async function AuditLogPage({
  searchParams,
}: {
  searchParams: { action?: string; from?: string; to?: string; page?: string };
}) {
  await requireAdmin();

  const admin = supabaseAdmin();
  const page = Math.max(1, Number(searchParams.page ?? 1));
  const from = (page - 1) * PAGE_SIZE;
  const to = from + PAGE_SIZE - 1;

  let query = admin.from("audit_logs").select("*", { count: "exact" });
  if (searchParams.action) query = query.eq("action", searchParams.action);
  if (searchParams.from) query = query.gte("created_at", new Date(searchParams.from).toISOString());
  if (searchParams.to) query = query.lte("created_at", new Date(searchParams.to + "T23:59:59").toISOString());

  const { data: rows, count } = await query.order("created_at", { ascending: false }).range(from, to);
  const entries = (rows ?? []) as AuditLogEntry[];

  const actorIds = Array.from(new Set(entries.map((e) => e.actor_user_id).filter((id): id is string => !!id)));
  const { data: actors } =
    actorIds.length > 0 ? await admin.from("profiles").select("*").in("id", actorIds) : { data: [] };
  const actorsById = new Map(((actors ?? []) as Profile[]).map((p) => [p.id, p]));

  return (
    <div className="flex flex-col gap-6">
      <div>
        <h1 className="font-display text-3xl font-semibold">Audit Log</h1>
        <p className="text-white/40">Append-only record of identity & access changes.</p>
      </div>

      <Card>
        <form className="grid gap-3 sm:grid-cols-4" method="get">
          <Select id="action" name="action" label="Action" tone="dark" defaultValue={searchParams.action ?? ""}>
            <option value="">Any action</option>
            {ACTIONS.map((a) => (
              <option key={a} value={a}>
                {a}
              </option>
            ))}
          </Select>
          <Input id="from" name="from" type="date" label="From" defaultValue={searchParams.from ?? ""} />
          <Input id="to" name="to" type="date" label="To" defaultValue={searchParams.to ?? ""} />
          <div className="flex items-end">
            <Button type="submit">Apply</Button>
          </div>
        </form>
      </Card>

      <Card className="p-0">
        {entries.length === 0 ? (
          <div className="p-10 text-center text-white/40">No matching audit events.</div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left text-sm">
              <thead className="border-b border-white/[0.08] text-xs uppercase tracking-wide text-white/40">
                <tr>
                  <th className="px-4 py-3 font-medium">When</th>
                  <th className="px-4 py-3 font-medium">Actor</th>
                  <th className="px-4 py-3 font-medium">Action</th>
                  <th className="px-4 py-3 font-medium">Target</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-white/[0.08]">
                {entries.map((e) => {
                  const actor = e.actor_user_id ? actorsById.get(e.actor_user_id) : null;
                  return (
                    <tr key={e.id} className="hover:bg-white/[0.03]">
                      <td className="px-4 py-3 text-xs text-white/40">{new Date(e.created_at).toLocaleString()}</td>
                      <td className="px-4 py-3">{actor?.email ?? "—"}</td>
                      <td className="px-4 py-3">
                        <code className="text-xs text-brand-400">{e.action}</code>
                      </td>
                      <td className="px-4 py-3 text-xs text-white/40">
                        {e.target_type}
                        {e.target_id ? ` · ${e.target_id.slice(0, 8)}` : ""}
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
        <Pagination
          page={page}
          pageSize={PAGE_SIZE}
          total={count ?? 0}
          basePath="/admin/audit-log"
          searchParams={{ action: searchParams.action, from: searchParams.from, to: searchParams.to }}
        />
      </Card>
    </div>
  );
}
