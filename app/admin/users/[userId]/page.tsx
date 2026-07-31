import { notFound } from "next/navigation";
import { requireAdmin } from "@/lib/access";
import { getUserWithAssignments } from "@/lib/iam";
import { supabaseAdmin } from "@/lib/supabase-admin";
import { updateUserStatus } from "../actions";
import { updateProfile, addAssignment, setAssignmentStatus } from "./actions";
import Card from "@/components/ui/Card";
import Input from "@/components/ui/Input";
import Select from "@/components/ui/Select";
import Button from "@/components/ui/Button";
import UserStatusBadge from "@/components/iam/StatusBadge";
import RoleBadge from "@/components/iam/RoleBadge";
import ConfirmActionDialog from "@/components/iam/ConfirmActionDialog";
import { PLATFORM_ROLES } from "@/lib/validation";
import type { AccessStatus, AuditLogEntry, Competition, Team } from "@/lib/types";

export const dynamic = "force-dynamic";

const ERROR_MESSAGES: Record<string, string> = {
  "not-found": "That user no longer exists.",
  "save-failed": "Could not save that change. Please try again.",
  "invalid-role": "Select a valid role.",
  forbidden: "You don't have permission to make that change.",
  "invalid-scope": "That team/competition combination isn't valid.",
};

export default async function UserDetailPage({
  params,
  searchParams,
}: {
  params: { userId: string };
  searchParams: { saved?: string; error?: string };
}) {
  await requireAdmin();

  const user = await getUserWithAssignments(params.userId);
  if (!user) notFound();

  const admin = supabaseAdmin();
  const [{ data: competitions }, { data: teams }, { data: auditRows }] = await Promise.all([
    admin.from("competitions").select("*").order("name"),
    admin.from("teams").select("*").order("name"),
    admin.from("audit_logs").select("*").eq("target_id", params.userId).order("created_at", { ascending: false }).limit(20),
  ]);

  let lastSignInAt: string | null = null;
  try {
    const { data: authUser } = await admin.auth.admin.getUserById(params.userId);
    lastSignInAt = authUser.user?.last_sign_in_at ?? null;
  } catch {
    // Best-effort — if the auth admin lookup fails for any reason, just omit last-login rather than error the page.
  }

  return (
    <div className="flex flex-col gap-6">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h1 className="font-display text-3xl font-semibold">{user.full_name || user.email}</h1>
          <p className="text-white/40">{user.email}</p>
        </div>
        <div className="flex items-center gap-3">
          <UserStatusBadge status={user.status} />
          <StatusActions userId={user.id} status={user.status} />
        </div>
      </div>

      {searchParams.saved && (
        <p className="rounded-lg bg-status-submitted/10 px-3 py-2 text-sm font-medium text-status-submitted">Saved.</p>
      )}
      {searchParams.error && (
        <p className="rounded-lg bg-status-correction/10 px-3 py-2 text-sm font-medium text-status-correction">
          {ERROR_MESSAGES[searchParams.error] ?? "Something went wrong."}
        </p>
      )}

      {/* Overview */}
      <Card>
        <h2 className="mb-4 font-display text-lg font-semibold">Overview</h2>
        <form action={updateProfile.bind(null, user.id)} className="grid gap-4 sm:grid-cols-2">
          <Input id="full_name" name="full_name" label="Full name" defaultValue={user.full_name ?? ""} />
          <Input id="email" name="email" label="Email" defaultValue={user.email} disabled />
          <div className="sm:col-span-2 flex gap-6 text-sm text-white/40">
            <span>Created {new Date(user.created_at).toLocaleString()}</span>
            <span>Updated {new Date(user.updated_at).toLocaleString()}</span>
            <span>Last login {lastSignInAt ? new Date(lastSignInAt).toLocaleString() : "—"}</span>
          </div>
          <Button type="submit" className="sm:col-span-2 w-fit">
            Save profile
          </Button>
        </form>
      </Card>

      {/* Access */}
      <Card>
        <h2 className="mb-1 font-display text-lg font-semibold">Access</h2>
        <p className="mb-4 text-sm text-white/40">Every workspace this user is authorized to enter.</p>

        <div className="mb-4 flex flex-col gap-2">
          {user.assignments.length === 0 && <p className="text-sm text-white/40">No assignments yet.</p>}
          {user.assignments.map((a) => (
            <div key={a.id} className="flex flex-wrap items-center justify-between gap-2 rounded-xl border border-white/[0.08] px-3 py-2.5">
              <div className="flex flex-wrap items-center gap-2">
                <RoleBadge role={a.role_key} />
                {a.team && <span className="text-sm text-white/40">{a.team.name}</span>}
                {a.competition && <span className="text-xs text-white/40">· {a.competition.name}</span>}
                <UserStatusBadge status={a.status} />
              </div>
              <div className="flex gap-2">
                {a.status === "active" ? (
                  <ConfirmActionDialog
                    triggerLabel="Suspend"
                    title="Suspend this assignment?"
                    body={`${user.full_name || user.email} will immediately lose access to this workspace. This can be reversed.`}
                    confirmLabel="Suspend"
                    action={setAssignmentStatus.bind(null, user.id, a.id, "suspended" as AccessStatus)}
                  />
                ) : (
                  <ConfirmActionDialog
                    triggerLabel="Reactivate"
                    title="Reactivate this assignment?"
                    body={`Restores ${user.full_name || user.email}'s access to this workspace.`}
                    confirmLabel="Reactivate"
                    action={setAssignmentStatus.bind(null, user.id, a.id, "active" as AccessStatus)}
                  />
                )}
                <ConfirmActionDialog
                  triggerLabel="Revoke"
                  triggerVariant="danger"
                  title="Revoke this assignment?"
                  body={`This immediately removes ${user.full_name || user.email}'s access to this workspace.`}
                  confirmLabel="Revoke"
                  action={setAssignmentStatus.bind(null, user.id, a.id, "disabled" as AccessStatus)}
                />
              </div>
            </div>
          ))}
        </div>

        <details className="rounded-xl border border-white/[0.08] px-3 py-2.5">
          <summary className="cursor-pointer text-sm font-medium text-brand-400">Add assignment</summary>
          <form action={addAssignment.bind(null, user.id)} className="mt-3 grid gap-3 sm:grid-cols-3">
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
            <Button type="submit" className="sm:col-span-3 w-fit">
              Add assignment
            </Button>
          </form>
        </details>
      </Card>

      {/* Activity */}
      <Card>
        <h2 className="mb-4 font-display text-lg font-semibold">Activity</h2>
        {(!auditRows || auditRows.length === 0) ? (
          <p className="text-sm text-white/40">No recorded activity yet.</p>
        ) : (
          <div className="flex flex-col divide-y divide-white/[0.08]">
            {(auditRows as AuditLogEntry[]).map((e) => (
              <div key={e.id} className="flex items-center justify-between gap-3 py-2 text-sm">
                <span className="text-white/80">{e.action.replace(/_/g, " ").replace(/\./g, " · ")}</span>
                <span className="text-xs text-white/40">{new Date(e.created_at).toLocaleString()}</span>
              </div>
            ))}
          </div>
        )}
      </Card>
    </div>
  );
}

function StatusActions({ userId, status }: { userId: string; status: AccessStatus }) {
  if (status === "active") {
    return (
      <div className="flex gap-2">
        <ConfirmActionDialog
          triggerLabel="Suspend"
          title="Suspend this account?"
          body="They will lose access to every workspace immediately. This can be reversed."
          confirmLabel="Suspend"
          action={updateUserStatus.bind(null, userId, "suspended" as AccessStatus)}
        />
        <ConfirmActionDialog
          triggerLabel="Disable"
          triggerVariant="danger"
          title="Disable this account?"
          body="They will lose access to every workspace immediately. This can be reversed."
          confirmLabel="Disable"
          action={updateUserStatus.bind(null, userId, "disabled" as AccessStatus)}
        />
      </div>
    );
  }

  return (
    <div className="flex gap-2">
      <ConfirmActionDialog
        triggerLabel="Reactivate"
        title="Reactivate this account?"
        body="Restores access to every currently-active assignment this account holds."
        confirmLabel="Reactivate"
        action={updateUserStatus.bind(null, userId, "active" as AccessStatus)}
      />
      <ConfirmActionDialog
        triggerLabel="Archive"
        triggerVariant="danger"
        title="Archive this account?"
        body="Kept for historical reference, but they will never be able to log in again unless reactivated."
        confirmLabel="Archive"
        action={updateUserStatus.bind(null, userId, "archived" as AccessStatus)}
      />
    </div>
  );
}
