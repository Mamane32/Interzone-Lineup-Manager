"use client";

import { useState } from "react";
import UserStatusBadge from "@/components/iam/StatusBadge";
import ConfirmActionDialog from "@/components/iam/ConfirmActionDialog";
import Button from "@/components/ui/Button";
import Drawer from "@/components/foundation/Drawer";
import StageFormFields from "@/components/foundation/StageFormFields";
import { updateStage, setStageStatus } from "@/app/admin/stages/actions";
import type { Division, Stage } from "@/lib/types";

export default function StageRow({ stage, divisions, divisionName }: { stage: Stage; divisions: Division[]; divisionName: string }) {
  const [open, setOpen] = useState(false);
  return (
    <>
      <tr className="hover:bg-white/[0.03]">
        <td className="px-4 py-3 font-medium">{stage.name}</td>
        <td className="px-4 py-3 text-white/40">{divisionName}</td>
        <td className="px-4 py-3 text-white/40">{stage.stage_type ?? "—"}</td>
        <td className="px-4 py-3"><UserStatusBadge status={stage.status} /></td>
        <td className="px-4 py-3">
          <Button type="button" variant="secondary" size="md" onClick={() => setOpen(true)}>View</Button>
        </td>
      </tr>
      {open && (
        <Drawer title={stage.name} subtitle={divisionName} onClose={() => setOpen(false)}>
          <form action={updateStage.bind(null, stage.id)} className="flex flex-col gap-4">
            <StageFormFields stage={stage} divisions={divisions} />
            <Button type="submit" className="w-fit">Save changes</Button>
          </form>
          <div className="mt-5 border-t border-white/[0.08] pt-4">
            {stage.status === "active" ? (
              <ConfirmActionDialog triggerLabel="Archive stage" triggerVariant="danger" title="Archive this stage?" body="Hidden from active lists, not deleted." confirmLabel="Archive" action={setStageStatus.bind(null, stage.id, "archived")} />
            ) : (
              <ConfirmActionDialog triggerLabel="Restore stage" title="Restore this stage?" body="It will reappear in active lists." confirmLabel="Restore" action={setStageStatus.bind(null, stage.id, "active")} />
            )}
          </div>
        </Drawer>
      )}
    </>
  );
}
