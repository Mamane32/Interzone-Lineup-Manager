"use client";

import { useState } from "react";
import UserStatusBadge from "@/components/iam/StatusBadge";
import ConfirmActionDialog from "@/components/iam/ConfirmActionDialog";
import Button from "@/components/ui/Button";
import Drawer from "@/components/foundation/Drawer";
import CompetitionFormFields from "@/components/foundation/CompetitionFormFields";
import { renameCompetition, deleteCompetition, setCompetitionStatus } from "@/app/admin/competitions/actions";
import type { Competition, Organization } from "@/lib/types";

export default function CompetitionRow({ competition, organizations, organizationName }: { competition: Competition; organizations: Organization[]; organizationName: string }) {
  const [open, setOpen] = useState(false);
  const status = competition.status ?? "active";

  return (
    <>
      <tr className="hover:bg-white/[0.03]">
        <td className="px-4 py-3 font-medium">{competition.name}</td>
        <td className="px-4 py-3 text-ink-muted">{organizationName}</td>
        <td className="px-4 py-3 text-ink-muted">{competition.competition_type ?? "—"}</td>
        <td className="px-4 py-3"><UserStatusBadge status={status} /></td>
        <td className="px-4 py-3">
          <Button type="button" variant="secondary" size="md" onClick={() => setOpen(true)}>View</Button>
        </td>
      </tr>
      {open && (
        <Drawer title={competition.name} subtitle={organizationName} onClose={() => setOpen(false)}>
          <form action={renameCompetition.bind(null, competition.id)} className="flex flex-col gap-4">
            <CompetitionFormFields competition={competition} organizations={organizations} />
            <Button type="submit" className="w-fit">Save changes</Button>
          </form>
          <div className="mt-5 flex flex-wrap gap-2 border-t border-ink-line pt-4">
            {status === "active" ? (
              <ConfirmActionDialog triggerLabel="Archive competition" triggerVariant="danger" title="Archive this competition?" body="Hidden from active lists, not deleted. Seasons and teams underneath are unaffected." confirmLabel="Archive" action={setCompetitionStatus.bind(null, competition.id, "archived")} />
            ) : (
              <ConfirmActionDialog triggerLabel="Restore competition" title="Restore this competition?" body="It will reappear in active lists." confirmLabel="Restore" action={setCompetitionStatus.bind(null, competition.id, "active")} />
            )}
            <form action={deleteCompetition.bind(null, competition.id)}>
              <Button type="submit" variant="danger" size="md">Delete permanently</Button>
            </form>
          </div>
        </Drawer>
      )}
    </>
  );
}
