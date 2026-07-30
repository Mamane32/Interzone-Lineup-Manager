import { requireAdmin } from "@/lib/access";
import { supabaseAdmin } from "@/lib/supabase-admin";
import { getRoleUserCounts } from "@/lib/iam";
import { updateRoleDescription } from "./actions";
import Card from "@/components/ui/Card";
import Button from "@/components/ui/Button";
import type { RoleMetadata } from "@/lib/types";

export const dynamic = "force-dynamic";

export default async function RolesPage() {
  await requireAdmin();

  const admin = supabaseAdmin();
  const [{ data: roles }, counts] = await Promise.all([
    admin.from("role_metadata").select("*").order("role_key"),
    getRoleUserCounts(),
  ]);

  const list = (roles ?? []) as RoleMetadata[];

  return (
    <div className="flex flex-col gap-6">
      <div>
        <h1 className="font-display text-3xl font-semibold">Roles</h1>
        <p className="text-ink-muted">
          System roles are fixed (they gate real routes in code) — you can edit each description for your team&apos;s
          reference.
        </p>
      </div>

      <div className="grid gap-4 sm:grid-cols-2">
        {list.map((r) => (
          <Card key={r.role_key}>
            <div className="mb-3 flex items-center justify-between">
              <div>
                <h2 className="font-display text-lg font-semibold">{r.name}</h2>
                <code className="text-xs text-ink-muted">{r.role_key}</code>
              </div>
              <div className="text-right">
                <p className="font-display text-2xl font-bold text-amber-signal">{counts[r.role_key] ?? 0}</p>
                <p className="text-xs text-ink-muted">active users</p>
              </div>
            </div>
            <form action={updateRoleDescription.bind(null, r.role_key)} className="flex flex-col gap-2">
              <textarea
                name="description"
                defaultValue={r.description ?? ""}
                rows={2}
                className="rounded-xl border border-ink-line bg-ink px-3 py-2 text-sm text-white focus:border-amber-signal focus:outline-none"
              />
              <Button type="submit" variant="secondary" size="md" className="w-fit">
                Save description
              </Button>
            </form>
            {r.is_system && (
              <p className="mt-3 text-xs text-ink-muted">System role — cannot be deleted or renamed.</p>
            )}
          </Card>
        ))}
      </div>
    </div>
  );
}
