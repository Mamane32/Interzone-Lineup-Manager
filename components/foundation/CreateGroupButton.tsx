"use client";

import { useState } from "react";
import Button from "@/components/ui/Button";
import Modal from "@/components/foundation/Modal";
import GroupFormFields from "@/components/foundation/GroupFormFields";
import { createGroup } from "@/app/admin/groups/actions";
import type { Stage } from "@/lib/types";

export default function CreateGroupButton({ stages }: { stages: Stage[] }) {
  const [open, setOpen] = useState(false);
  return (
    <>
      <Button type="button" onClick={() => setOpen(true)}>New group</Button>
      {open && (
        <Modal onClose={() => setOpen(false)}>
          <h2 className="mb-4 font-display text-lg font-semibold text-white">New group</h2>
          <form action={createGroup} className="flex flex-col gap-4">
            <GroupFormFields stages={stages} />
            <div className="flex gap-2">
              <Button type="button" variant="secondary" onClick={() => setOpen(false)} className="flex-1">Cancel</Button>
              <Button type="submit" className="flex-1">Create</Button>
            </div>
          </form>
        </Modal>
      )}
    </>
  );
}
