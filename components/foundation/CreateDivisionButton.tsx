"use client";

import { useState } from "react";
import Button from "@/components/ui/Button";
import Modal from "@/components/foundation/Modal";
import DivisionFormFields from "@/components/foundation/DivisionFormFields";
import { createDivision } from "@/app/admin/divisions/actions";
import type { Season } from "@/lib/types";

export default function CreateDivisionButton({ seasons }: { seasons: Season[] }) {
  const [open, setOpen] = useState(false);
  return (
    <>
      <Button type="button" onClick={() => setOpen(true)}>
        New division
      </Button>
      {open && (
        <Modal onClose={() => setOpen(false)}>
          <h2 className="mb-4 font-display text-lg font-semibold text-white">New division</h2>
          <form action={createDivision} className="flex flex-col gap-4">
            <DivisionFormFields seasons={seasons} />
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
