"use client";

import { useState } from "react";
import Button from "@/components/ui/Button";
import Modal from "@/components/foundation/Modal";
import SeasonFormFields from "@/components/foundation/SeasonFormFields";
import { createSeason } from "@/app/admin/seasons/actions";
import type { Competition } from "@/lib/types";

export default function CreateSeasonButton({ competitions }: { competitions: Competition[] }) {
  const [open, setOpen] = useState(false);

  return (
    <>
      <Button type="button" onClick={() => setOpen(true)}>
        New season
      </Button>

      {open && (
        <Modal onClose={() => setOpen(false)}>
          <h2 className="mb-4 font-display text-lg font-semibold text-white">New season</h2>
          <form action={createSeason} className="flex flex-col gap-4">
            <SeasonFormFields competitions={competitions} />
            <div className="flex gap-2">
              <Button type="button" variant="secondary" onClick={() => setOpen(false)} className="flex-1">
                Cancel
              </Button>
              <Button type="submit" className="flex-1">
                Create
              </Button>
            </div>
          </form>
        </Modal>
      )}
    </>
  );
}
