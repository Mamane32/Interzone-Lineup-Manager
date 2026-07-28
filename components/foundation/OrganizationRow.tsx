"use client";

import { useState } from "react";
import UserStatusBadge from "@/components/iam/StatusBadge";
import ConfirmActionDialog from "@/components/iam/ConfirmActionDialog";
import Button from "@/components/ui/Button";
import Drawer from "@/components/foundation/Drawer";
import OrganizationFormFields from "@/components/foundation/OrganizationFormFields";
import { updateOrganization, setOrganizationStatus } from "@/app/admin/organizations/actions";
import type { Organization } from "@/lib/types";

export default function OrganizationRow({ org }: { org: Organization }) {
  const [open, setOpen] = useState(false);

  return (
    <>
      <tr className="hover:bg-white/[0.03]">
        <td className="px-4 py-3 font-medium">{org.name}</td>
        <td className="px-4 py-3 text-ink-muted">{org.short_name || "—"}</td>
        <td className="px-4 py-3 text-xs text-ink-muted">{org.slug}</td>
        <td className="px-4 py-3 text-ink-muted">{[org.city, org.country].filter(Boolean).join(", ") || "—"}</td>
        <td className="px-4 py-3">
          <UserStatusBadge status={org.status} />
        </td>
        <td className="px-4 py-3">
          <Button type="button" variant="secondary" size="md" onClick={() => setOpen(true)}>
            View
          </Button>
        </td>
      </tr>

      {open && (
        <Drawer title={org.name} subtitle={org.slug} onClose={() => setOpen(false)}>
          <form action={updateOrganization.bind(null, org.id)} className="flex flex-col gap-4">
            <OrganizationFormFields org={org} />
            <Button type="submit" className="w-fit">
              Save changes
            </Button>
          </form>

          <div className="mt-5 border-t border-ink-line pt-4">
            {org.status === "active" ? (
              <ConfirmActionDialog
                triggerLabel="Archive organization"
                triggerVariant="danger"
                title="Archive this organization?"
                body="Archived organizations are hidden from active lists but not deleted, and can be restored anytime."
                confirmLabel="Archive"
                action={setOrganizationStatus.bind(null, org.id, "archived")}
              />
            ) : (
              <ConfirmActionDialog
                triggerLabel="Restore organization"
                title="Restore this organization?"
                body="It will reappear in active lists immediately."
                confirmLabel="Restore"
                action={setOrganizationStatus.bind(null, org.id, "active")}
              />
            )}
          </div>
        </Drawer>
      )}
    </>
  );
}
