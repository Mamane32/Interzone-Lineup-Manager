"use client";

import { useState } from "react";
import Link from "next/link";
import { Palette } from "lucide-react";
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
      <Button type="button" variant="secondary" size="md" onClick={() => setOpen(true)}>Manage</Button>
      {open && (
        <Drawer title={competition.name} subtitle={organizationName} onClose={() => setOpen(false)}>
          <div className="mb-4 flex items-center justify-between">
            <UserStatusBadge status={status} />
            <Link href={`/admin/competitions/${competition.id}/branding`}>
              <Button type="button" variant="secondary" size="md">
                <Palette size={14} /> Branding
              </Button>
            </Link>
          </div>
          <form action={renameCompetition.bind(null, competition.id)} className="flex flex-col gap-4">
            <CompetitionFormFields competition={competition} organizations={organizations} />
            <Button type="submit" className="w-fit">Save changes</Button>
          </form>
          <div className="mt-5 flex flex-wrap gap-2 border-t border-white/[0.08] pt-4">
            {status === "active" ? (
              <ConfirmActionDialog triggerLabel="Archive competition" triggerVariant="danger" title="Archive this competition?" body="Hidden from active lists, not deleted. Seasons and teams underneath are unaffected." confirmLabel="Archive" action={setCompetitionStatus.bind(null, competition.id, "archived")} />
            ) : (
              <ConfirmActionDialog triggerLabel="Restore competition" title="Restore this competition?" body="It will reappear in active lists." confirmLabel="Restore" action={setCompetitionStatus.bind(null, competition.id, "active")} />
            )}
            <ConfirmActionDialog
              triggerLabel="Delete permanently"
              triggerVariant="danger"
              title="Delete this competition?"
              body={`${competition.name} and everything nested under it (seasons, teams, matches) will be permanently removed. This cannot be undone.`}
              confirmLabel="Delete permanently"
              action={deleteCompetition.bind(null, competition.id)}
            />
          </div>
        </Drawer>
      )}
    </>
  );
}
