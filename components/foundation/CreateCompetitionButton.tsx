"use client";

import { useState } from "react";
import Button from "@/components/ui/Button";
import Modal from "@/components/foundation/Modal";
import CompetitionFormFields from "@/components/foundation/CompetitionFormFields";
import { createCompetition } from "@/app/admin/competitions/actions";
import type { Organization } from "@/lib/types";

export default function CreateCompetitionButton({ organizations }: { organizations: Organization[] }) {
  const [open, setOpen] = useState(false);
  return (
    <>
      <Button type="button" onClick={() => setOpen(true)}>New competition</Button>
      {open && (
        <Modal onClose={() => setOpen(false)}>
          <h2 className="mb-4 font-display text-lg font-semibold text-white">New competition</h2>
          <form action={createCompetition} className="flex flex-col gap-4">
            <CompetitionFormFields organizations={organizations} />
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
