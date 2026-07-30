import { AlertTriangle } from "lucide-react";
import { requireAdmin } from "@/lib/access";
import { supabaseAdmin } from "@/lib/supabase-admin";
import { getLegacyCoachTeams } from "@/lib/iam";
import { createAssignment, updateAssignmentStatus } from "./actions";
import Card from "@/components/ui/Card";
import Select from "@/components/ui/Select";
import Button from "@/components/ui/Button";
import RoleBadge from "@/components/iam/RoleBadge";
import UserStatusBadge from "@/components/iam/StatusBadge";
import ConfirmActionDialog from "@/components/iam/ConfirmActionDialog";
import { PLATFORM_ROLES } from "@/lib/validation";
import type { AccessStatus, Competition, Profile, Team } from "@/lib/types";
import type { AssignmentWithScope } from "@/lib/iam";

export const dynamic = "force-dynamic";

const ERROR_MESSAGES: Record<string, string> = {
  "missing-fields": "Select a user and a valid role.",
  "not-found": "That user no longer exists.",
  forbidden: "You don't have permission to make that change.",
  "invalid-scope": "That team/competition combination isn't valid.",
  "save-failed": "Could not save that assignment. Please try again.",
};

export default async function AccessAssignmentsPage({
  searchParams,
}: {
  searchParams: { saved?: string; error?: string };
}) {
  await requireAdmin();

  const admin = supabaseAdmin();
  const [{ data: assignments }, { data: profiles }, { data: competitions }, { data: teams }, legacyTeams] = await Promise.all([
    admin
      .from("user_access_assignments")
      .select("*, team:teams(id, name), competition:competitions(id, name)")
      .order("created_at", { ascending: false })
      .limit(100),
    admin.from("profiles").select("*").order("email"),
    admin.from("competitions").select("*").order("name"),
    admin.from("teams").select("*").order("name"),
    getLegacyCoachTeams(),
  ]);

  const profilesById = new Map(((profiles ?? []) as Profile[]).map((p) => [p.id, p]));

  return (
    <div className="flex flex-col gap-6">
      <div>
        <h1 className="font-display text-3xl font-semibold">Access Assignments</h1>
        <p className="text-ink-muted">Every role grant across the platform.</p>
      </div>

      {searchParams.saved && (
        <p className="rounded-lg bg-status-submitted/10 px-3 py-2 text-sm font-medium text-status-submitted">Saved.</p>
      )}
      {searchParams.error && (
        <p className="rounded-lg bg-status-correction/10 px-3 py-2 text-sm font-medium text-status-correction">
          {ERROR_MESSAGES[searchParams.error] ?? "Something went wrong."}
        </p>
      )}

      {legacyTeams.length > 0 && (
        <Card className="border-status-waiting/30 bg-status-waiting/5">
          <div className="flex items-start gap-3">
            <AlertTriangle size={18} className="mt-0.5 flex-none text-status-waiting" />
            <div>
              <p className="font-semibold text-status-waiting">
                {legacyTeams.length} team{legacyTeams.length === 1 ? "" : "s"} still on legacy email-based coach access
              </p>
              <p className="mt-1 text-sm text-ink-muted">
                These teams&apos; coach login still relies on matching <code>coach_email</code> to the signed-in user —
                there&apos;s no real assignment row yet (see <code>lib/coach-auth.ts</code>). Send a fresh invite from the{" "}
                <a href="/admin/invitations" className="text-amber-signal hover:underline">
                  Invitations
                </a>{" "}
                page for each to create a real assignment; once every team here is gone, the email fallback can be
                safely removed.
              </p>
              <ul className="mt-2 flex flex-wrap gap-2">
                {legacyTeams.map((t) => (
                  <li key={t.id} className="rounded-full bg-white/5 px-2.5 py-1 text-xs text-ink-muted">
                    {t.name}
                  </li>
                ))}
              </ul>
            </div>
          </div>
        </Card>
      )}

      <Card className="max-w-3xl">
        <h2 className="mb-4 font-display text-lg font-semibold">Add assignment</h2>
        <form action={createAssignment} className="grid gap-4 sm:grid-cols-2">
          <Select id="user_id" name="user_id" label="User" tone="dark" required>
            <option value="">Select user</option>
            {((profiles ?? []) as Profile[]).map((p) => (
              <option key={p.id} value={p.id}>
                {p.full_name ? `${p.full_name} — ${p.email}` : p.email}
              </option>
            ))}
          </Select>
          <Select id="role_key" name="role_key" label="Role" tone="dark" required>
            <option value="">Select role</option>
            {PLATFORM_ROLES.map((r) => (
              <option key={r} value={r}>
                {r.replace("_", " ")}
              </option>
            ))}
          </Select>
          <Select id="competition_id" name="competition_id" label="Competition (optional)" tone="dark">
            <option value="">None</option>
            {((competitions ?? []) as Competition[]).map((c) => (
              <option key={c.id} value={c.id}>
                {c.name}
              </option>
            ))}
          </Select>
          <Select id="team_id" name="team_id" label="Team (optional)" tone="dark">
            <option value="">None</option>
            {((teams ?? []) as Team[]).map((t) => (
              <option key={t.id} value={t.id}>
                {t.name}
              </option>
            ))}
          </Select>
          <Button type="submit" className="sm:col-span-2 w-fit">
            Add assignment
          </Button>
        </form>
      </Card>

      <Card className="p-0">
        <div className="overflow-x-auto">
          <table className="w-full text-left text-sm">
            <thead className="border-b border-ink-line text-xs uppercase tracking-wide text-ink-muted">
              <tr>
                <th className="px-4 py-3 font-medium">User</th>
                <th className="px-4 py-3 font-medium">Role</th>
                <th className="px-4 py-3 font-medium">Scope</th>
                <th className="px-4 py-3 font-medium">Status</th>
                <th className="px-4 py-3 font-medium">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-ink-line">
              {((assignments ?? []) as AssignmentWithScope[]).map((a) => {
                const profile = profilesById.get(a.user_id);
                return (
                  <tr key={a.id} className="hover:bg-white/[0.03]">
                    <td className="px-4 py-3">{profile?.full_name || profile?.email || a.user_id}</td>
                    <td className="px-4 py-3">
                      <RoleBadge role={a.role_key} />
                    </td>
                    <td className="px-4 py-3 text-xs text-ink-muted">
                      {a.team?.name}
                      {a.team && a.competition ? " · " : ""}
                      {a.competition?.name}
                      {!a.team && !a.competition && "—"}
                    </td>
                    <td className="px-4 py-3">
                      <UserStatusBadge status={a.status} />
                    </td>
                    <td className="px-4 py-3">
                      {a.status === "active" ? (
                        <ConfirmActionDialog
                          triggerLabel="Suspend"
                          title="Suspend this assignment?"
                          body={`${profile?.full_name || profile?.email || "This user"} will immediately lose access to this workspace.`}
                          confirmLabel="Suspend"
                          action={updateAssignmentStatus.bind(null, a.id, "suspended" as AccessStatus)}
                        />
                      ) : (
                        <ConfirmActionDialog
                          triggerLabel="Reactivate"
                          title="Reactivate this assignment?"
                          body={`Restores ${profile?.full_name || profile?.email || "this user"}'s access to this workspace.`}
                          confirmLabel="Reactivate"
                          action={updateAssignmentStatus.bind(null, a.id, "active" as AccessStatus)}
                        />
                      )}
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </Card>
    </div>
  );
}
