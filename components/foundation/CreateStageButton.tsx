"use client";

import { useState } from "react";
import Button from "@/components/ui/Button";
import Modal from "@/components/foundation/Modal";
import StageFormFields from "@/components/foundation/StageFormFields";
import { createStage } from "@/app/admin/stages/actions";
import type { Division } from "@/lib/types";

export default function CreateStageButton({ divisions }: { divisions: Division[] }) {
  const [open, setOpen] = useState(false);
  return (
    <>
      <Button type="button" onClick={() => setOpen(true)}>New stage</Button>
      {open && (
        <Modal onClose={() => setOpen(false)}>
          <h2 className="mb-4 font-display text-lg font-semibold text-white">New stage</h2>
          <form action={createStage} className="flex flex-col gap-4">
            <StageFormFields divisions={divisions} />
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
