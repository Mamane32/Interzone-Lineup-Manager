import { notFound } from "next/navigation";
import { ShieldAlert } from "lucide-react";
import { requireAdmin, getSessionUser } from "@/lib/access";
import { getUserWithAssignments } from "@/lib/iam";
import { supabaseAdmin } from "@/lib/supabase-admin";
import { countActiveUsersWithRole } from "@/lib/privilege";
import { updateUserStatus } from "../actions";
import { updateProfile, addAssignment, setAssignmentStatus, forcePasswordReset, deleteUser } from "./actions";
import Card from "@/components/ui/Card";
import Input from "@/components/ui/Input";
import Select from "@/components/ui/Select";
import Button from "@/components/ui/Button";
import UserStatusBadge from "@/components/iam/StatusBadge";
import RoleBadge from "@/components/iam/RoleBadge";
import ConfirmActionDialog from "@/components/iam/ConfirmActionDialog";
import { PLATFORM_ROLES } from "@/lib/validation";
import type { AccessStatus, AuditLogEntry, Competition, PlatformRole, Team, UserAccessAssignment } from "@/lib/types";

const ADMIN_CAPABLE_ROLES: PlatformRole[] = ["admin", "super_admin"];

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
  const actor = await getSessionUser();

  const user = await getUserWithAssignments(params.userId);
  if (!user) notFound();

  const admin = supabaseAdmin();
  const [{ data: competitions }, { data: teams }, { data: auditRows }, activeSuperAdminCount] = await Promise.all([
    admin.from("competitions").select("*").order("name"),
    admin.from("teams").select("*").order("name"),
    admin.from("audit_logs").select("*").eq("target_id", params.userId).order("created_at", { ascending: false }).limit(20),
    countActiveUsersWithRole("super_admin"),
  ]);

  // Platform Owner protection (Sprint 3 acceptance review): the server
  // actions already refuse these changes (lib/privilege.ts's
  // assertNotLastSuperAdmin / assertNotSelfLockout /
  // assertAccountStatusChangeSafe) — this is the UI never offering a
  // button that would only fail anyway.
  const isViewingSelf = actor?.id === user.id;
  const targetHoldsActiveSuperAdmin = user.assignments.some((a) => a.role_key === "super_admin" && a.status === "active");
  const isLastSuperAdmin = targetHoldsActiveSuperAdmin && activeSuperAdminCount <= 1;
  const ownActiveAdminAssignmentCount = isViewingSelf
    ? user.assignments.filter((a) => a.status === "active" && ADMIN_CAPABLE_ROLES.includes(a.role_key)).length
    : 0;

  function protectedAssignmentReason(a: UserAccessAssignment): "last_super_admin" | "self_lockout" | null {
    if (a.status !== "active") return null;
    // Checked in this order deliberately: if it's genuinely the platform's
    // last super_admin, say so even when the viewer also happens to be
    // looking at their own account — that's the more specific, more
    // useful reason for anyone else who reads this later.
    if (a.role_key === "super_admin" && isLastSuperAdmin) return "last_super_admin";
    if (isViewingSelf && ADMIN_CAPABLE_ROLES.includes(a.role_key) && ownActiveAdminAssignmentCount <= 1) return "self_lockout";
    return null;
  }

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
          <StatusActions userId={user.id} status={user.status} isProtected={isViewingSelf || isLastSuperAdmin} />
        </div>
      </div>

      {isLastSuperAdmin && (
        <p className="flex items-center gap-2 rounded-lg bg-amber-signal/10 px-3 py-2 text-sm font-medium text-amber-signal">
          <ShieldAlert size={15} /> This is the platform&apos;s last active super administrator — suspend/disable actions are unavailable until another account is granted super_admin.
        </p>
      )}

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

        <div className="mt-5 flex flex-wrap items-center justify-between gap-3 border-t border-white/[0.08] pt-4">
          <div>
            <p className="text-sm font-medium text-white">Force password reset</p>
            <p className="text-xs text-white/40">
              Signs this account out of every device immediately and emails a reset link. Access returns only once a new password is set.
            </p>
          </div>
          <ConfirmActionDialog
            triggerLabel="Force Password Reset"
            triggerVariant="danger"
            title="Force a password reset?"
            body={`${user.full_name || user.email} will be signed out of every device immediately and sent a password reset email. They'll only regain access once they set a new password.`}
            confirmLabel="Send reset"
            action={forcePasswordReset.bind(null, user.id)}
            disabled={user.status !== "active" && user.status !== "suspended"}
            disabledReason="Only available for active or suspended accounts."
          />
        </div>
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
                {protectedAssignmentReason(a) ? (
                  <span className="rounded-lg bg-white/[0.04] px-2.5 py-1.5 text-xs font-medium text-white/30">
                    {protectedAssignmentReason(a) === "last_super_admin" ? "Last super admin — protected" : "Your last admin access — protected"}
                  </span>
                ) : a.status === "active" ? (
                  <>
                    <ConfirmActionDialog
                      triggerLabel="Suspend"
                      title="Suspend this assignment?"
                      body={`${user.full_name || user.email} will immediately lose access to this workspace. This can be reversed.`}
                      confirmLabel="Suspend"
                      action={setAssignmentStatus.bind(null, user.id, a.id, "suspended" as AccessStatus)}
                    />
                    <ConfirmActionDialog
                      triggerLabel="Revoke"
                      triggerVariant="danger"
                      title="Revoke this assignment?"
                      body={`This immediately removes ${user.full_name || user.email}'s access to this workspace.`}
                      confirmLabel="Revoke"
                      action={setAssignmentStatus.bind(null, user.id, a.id, "disabled" as AccessStatus)}
                    />
                  </>
                ) : (
                  <>
                    <ConfirmActionDialog
                      triggerLabel="Reactivate"
                      title="Reactivate this assignment?"
                      body={`Restores ${user.full_name || user.email}'s access to this workspace.`}
                      confirmLabel="Reactivate"
                      action={setAssignmentStatus.bind(null, user.id, a.id, "active" as AccessStatus)}
                    />
                    <ConfirmActionDialog
                      triggerLabel="Revoke"
                      triggerVariant="danger"
                      title="Revoke this assignment?"
                      body={`This immediately removes ${user.full_name || user.email}'s access to this workspace.`}
                      confirmLabel="Revoke"
                      action={setAssignmentStatus.bind(null, user.id, a.id, "disabled" as AccessStatus)}
                    />
                  </>
                )}
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

      {/* Danger zone — permanent, unlike every action above */}
      <Card className="border-status-correction/30">
        <h2 className="mb-1 font-display text-lg font-semibold text-status-correction">Danger zone</h2>
        <p className="mb-4 text-sm text-white/40">
          Permanently removes this identity — invitation, profile, every assignment, and the Auth account. Unlike
          Suspend/Disable/Archive above, this cannot be undone. Inviting this email again afterward creates a
          completely new account, with no memory of this one.
        </p>
        <ConfirmActionDialog
          triggerLabel="Delete this user"
          triggerVariant="danger"
          title="Permanently delete this user?"
          body={`${user.full_name || user.email} will be completely removed — invitation, profile, every assignment, and the Auth account. This cannot be undone. A future invitation to ${user.email} will be treated as a brand-new user.`}
          confirmLabel="Delete permanently"
          action={deleteUser.bind(null, user.id)}
          disabled={isViewingSelf || isLastSuperAdmin}
          disabledReason={isViewingSelf ? "You cannot delete your own account." : "The platform's last active super administrator cannot be deleted."}
        />
      </Card>
    </div>
  );
}

function StatusActions({ userId, status, isProtected }: { userId: string; status: AccessStatus; isProtected: boolean }) {
  if (status === "active") {
    // Platform Owner protection: the platform's last active super admin,
    // or the signed-in admin's own account, never gets a Suspend/Disable
    // button — lib/privilege.ts's server-side guards would refuse the
    // action anyway; this is the UI not offering one that can only fail.
    if (isProtected) return null;

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
      {status !== "archived" && (
        <ConfirmActionDialog
          triggerLabel="Archive"
          triggerVariant="danger"
          title="Archive this account?"
          body="Kept for historical reference, but they will never be able to log in again unless reactivated."
          confirmLabel="Archive"
          action={updateUserStatus.bind(null, userId, "archived" as AccessStatus)}
        />
      )}
    </div>
  );
}
