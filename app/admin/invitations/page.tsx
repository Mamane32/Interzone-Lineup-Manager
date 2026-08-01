import { requireAdmin } from "@/lib/access";
import { supabaseAdmin } from "@/lib/supabase-admin";
import { effectiveInvitationStatus } from "@/lib/utils";
import { inviteUser, resendInvitation, revokeInvitation } from "./actions";
import Card from "@/components/ui/Card";
import Input from "@/components/ui/Input";
import Select from "@/components/ui/Select";
import Button from "@/components/ui/Button";
import InvitationStatusBadge from "@/components/iam/InvitationStatusBadge";
import RoleBadge from "@/components/iam/RoleBadge";
import { PLATFORM_ROLES } from "@/lib/validation";
import type { Competition, Invitation, Team } from "@/lib/types";

export const dynamic = "force-dynamic";

const ERROR_MESSAGES: Record<string, string> = {
  "missing-fields": "Email and role are required.",
  forbidden: "You don't have permission to grant that role.",
  "invalid-scope": "That team/competition combination isn't valid.",
  "setup-failed": "The invite email was sent, but finishing account setup failed — check the audit log and try again.",
  "not-found": "That invitation no longer exists.",
  "not-pending": "Only a pending invitation can be resent or revoked.",
  "save-failed": "Could not save the invitation. Please try again.",
  "email-failed":
    "The invitation record was saved, but the email could not be sent — check that Supabase Auth email is configured (Authentication → Email Templates / SMTP settings).",
};

export default async function InvitationsPage({
  searchParams,
}: {
  searchParams: { sent?: string; resent?: string; revoked?: string; error?: string };
}) {
  const { role: actorRole } = await requireAdmin();
  const invitableRoles = actorRole === "super_admin" ? PLATFORM_ROLES : PLATFORM_ROLES.filter((r) => r !== "super_admin");

  const admin = supabaseAdmin();
  const [{ data: invitations }, { data: competitions }, { data: teams }] = await Promise.all([
    admin.from("invitations").select("*").order("created_at", { ascending: false }).limit(50),
    admin.from("competitions").select("*").order("name"),
    admin.from("teams").select("*").order("name"),
  ]);

  const list = (invitations ?? []) as Invitation[];

  return (
    <div className="flex flex-col gap-6">
      <div>
        <h1 className="font-display text-3xl font-semibold">Invitations</h1>
        <p className="text-white/40">Invite platform users and track invitation status.</p>
      </div>

      <Card className="max-w-3xl">
        <h2 className="mb-4 font-display text-lg font-semibold">Invite a user</h2>
        {searchParams.sent && (
          <p className="mb-4 rounded-lg bg-status-submitted/10 px-3 py-2 text-sm font-medium text-status-submitted">
            Invitation sent.
          </p>
        )}
        {searchParams.resent && (
          <p className="mb-4 rounded-lg bg-status-submitted/10 px-3 py-2 text-sm font-medium text-status-submitted">
            Invitation resent.
          </p>
        )}
        {searchParams.revoked && (
          <p className="mb-4 rounded-lg bg-status-submitted/10 px-3 py-2 text-sm font-medium text-status-submitted">
            Invitation revoked.
          </p>
        )}
        {searchParams.error && (
          <p className="mb-4 rounded-lg bg-status-correction/10 px-3 py-2 text-sm font-medium text-status-correction">
            {ERROR_MESSAGES[searchParams.error] ?? "Something went wrong."}
          </p>
        )}
        <form action={inviteUser} className="grid gap-4 sm:grid-cols-2">
          <Input id="full_name" name="full_name" label="Full name" />
          <Input id="email" name="email" type="email" label="Email" required />
          <Select id="role_key" name="role_key" label="Role" tone="dark" required>
            <option value="">Select role</option>
            {invitableRoles.map((r) => (
              <option key={r} value={r}>
                {r.replace("_", " ")}
              </option>
            ))}
          </Select>
          <Input id="expires_at" name="expires_at" type="date" label="Expires (optional)" />
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
          <div className="sm:col-span-2 flex flex-col gap-1.5">
            <label htmlFor="message" className="text-sm font-medium text-white/40">
              Message (optional)
            </label>
            <textarea
              id="message"
              name="message"
              rows={2}
              className="rounded-xl border border-white/[0.08] bg-surface-950 px-3 py-2 text-white focus:border-brand-400 focus:outline-none"
            />
          </div>
          <Button type="submit" className="sm:col-span-2 w-fit">
            Send invitation
          </Button>
        </form>
      </Card>

      <Card className="p-0">
        {list.length === 0 ? (
          <div className="p-10 text-center text-white/40">No invitations yet.</div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left text-sm">
              <thead className="border-b border-white/[0.08] text-xs uppercase tracking-wide text-white/40">
                <tr>
                  <th className="px-4 py-3 font-medium">Email</th>
                  <th className="px-4 py-3 font-medium">Role</th>
                  <th className="px-4 py-3 font-medium">Status</th>
                  <th className="px-4 py-3 font-medium">Sent</th>
                  <th className="px-4 py-3 font-medium">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-white/[0.08]">
                {list.map((inv) => (
                  <tr key={inv.id} className="hover:bg-white/[0.03]">
                    <td className="px-4 py-3">
                      <p className="font-medium">{inv.full_name || inv.email}</p>
                      <p className="text-xs text-white/40">{inv.email}</p>
                    </td>
                    <td className="px-4 py-3">
                      <RoleBadge role={inv.role_key} />
                    </td>
                    <td className="px-4 py-3">
                      <InvitationStatusBadge status={effectiveInvitationStatus(inv)} />
                    </td>
                    <td className="px-4 py-3 text-xs text-white/40">{new Date(inv.created_at).toLocaleDateString()}</td>
                    <td className="px-4 py-3">
                      {inv.status === "pending" && (
                        <div className="flex gap-2">
                          <form action={resendInvitation.bind(null, inv.id)}>
                            <Button type="submit" variant="secondary" size="md">
                              Resend
                            </Button>
                          </form>
                          <form action={revokeInvitation.bind(null, inv.id)}>
                            <Button type="submit" variant="danger" size="md">
                              Revoke
                            </Button>
                          </form>
                        </div>
                      )}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </Card>
    </div>
  );
}
