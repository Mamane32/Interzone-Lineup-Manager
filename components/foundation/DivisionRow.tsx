"use client";

import { useState } from "react";
import UserStatusBadge from "@/components/iam/StatusBadge";
import ConfirmActionDialog from "@/components/iam/ConfirmActionDialog";
import Button from "@/components/ui/Button";
import Drawer from "@/components/foundation/Drawer";
import DivisionFormFields from "@/components/foundation/DivisionFormFields";
import { updateDivision, setDivisionStatus } from "@/app/admin/divisions/actions";
import type { Division, Season } from "@/lib/types";

export default function DivisionRow({ division, seasons, seasonName }: { division: Division; seasons: Season[]; seasonName: string }) {
  const [open, setOpen] = useState(false);
  return (
    <>
      <tr className="hover:bg-white/[0.03]">
        <td className="px-4 py-3 font-medium">{division.name}</td>
        <td className="px-4 py-3 text-white/40">{seasonName}</td>
        <td className="px-4 py-3 text-white/40">{division.abbreviation ?? "—"}</td>
        <td className="px-4 py-3"><UserStatusBadge status={division.status} /></td>
        <td className="px-4 py-3">
          <Button type="button" variant="secondary" size="md" onClick={() => setOpen(true)}>View</Button>
        </td>
      </tr>
      {open && (
        <Drawer title={division.name} subtitle={seasonName} onClose={() => setOpen(false)}>
          <form action={updateDivision.bind(null, division.id)} className="flex flex-col gap-4">
            <DivisionFormFields division={division} seasons={seasons} />
            <Button type="submit" className="w-fit">Save changes</Button>
          </form>
          <div className="mt-5 border-t border-white/[0.08] pt-4">
            {division.status === "active" ? (
              <ConfirmActionDialog triggerLabel="Archive division" triggerVariant="danger" title="Archive this division?" body="Hidden from active lists, not deleted." confirmLabel="Archive" action={setDivisionStatus.bind(null, division.id, "archived")} />
            ) : (
              <ConfirmActionDialog triggerLabel="Restore division" title="Restore this division?" body="It will reappear in active lists." confirmLabel="Restore" action={setDivisionStatus.bind(null, division.id, "active")} />
            )}
          </div>
        </Drawer>
      )}
    </>
  );
}
