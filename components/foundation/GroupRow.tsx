"use client";

import { useState } from "react";
import UserStatusBadge from "@/components/iam/StatusBadge";
import ConfirmActionDialog from "@/components/iam/ConfirmActionDialog";
import Button from "@/components/ui/Button";
import Drawer from "@/components/foundation/Drawer";
import GroupFormFields from "@/components/foundation/GroupFormFields";
import { updateGroup, setGroupStatus } from "@/app/admin/groups/actions";
import type { CompetitionGroup, Stage } from "@/lib/types";

export default function GroupRow({ group, stages, stageName }: { group: CompetitionGroup; stages: Stage[]; stageName: string }) {
  const [open, setOpen] = useState(false);
  return (
    <>
      <tr className="hover:bg-white/[0.03]">
        <td className="px-4 py-3 font-medium">{group.name}</td>
        <td className="px-4 py-3 text-white/40">{stageName}</td>
        <td className="px-4 py-3"><UserStatusBadge status={group.status} /></td>
        <td className="px-4 py-3">
          <Button type="button" variant="secondary" size="md" onClick={() => setOpen(true)}>View</Button>
        </td>
      </tr>
      {open && (
        <Drawer title={group.name} subtitle={stageName} onClose={() => setOpen(false)}>
          <form action={updateGroup.bind(null, group.id)} className="flex flex-col gap-4">
            <GroupFormFields group={group} stages={stages} />
            <Button type="submit" className="w-fit">Save changes</Button>
          </form>
          <div className="mt-5 border-t border-white/[0.08] pt-4">
            {group.status === "active" ? (
              <ConfirmActionDialog triggerLabel="Archive group" triggerVariant="danger" title="Archive this group?" body="Hidden from active lists, not deleted." confirmLabel="Archive" action={setGroupStatus.bind(null, group.id, "archived")} />
            ) : (
              <ConfirmActionDialog triggerLabel="Restore group" title="Restore this group?" body="It will reappear in active lists." confirmLabel="Restore" action={setGroupStatus.bind(null, group.id, "active")} />
            )}
          </div>
        </Drawer>
      )}
    </>
  );
}
