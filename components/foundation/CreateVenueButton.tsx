"use client";

import { useState } from "react";
import Button from "@/components/ui/Button";
import Modal from "@/components/foundation/Modal";
import VenueFormFields from "@/components/foundation/VenueFormFields";
import { createVenue } from "@/app/admin/venues/actions";
import type { Organization } from "@/lib/types";

export default function CreateVenueButton({ organizations }: { organizations: Organization[] }) {
  const [open, setOpen] = useState(false);

  return (
    <>
      <Button type="button" onClick={() => setOpen(true)}>
        New venue
      </Button>

      {open && (
        <Modal onClose={() => setOpen(false)}>
          <h2 className="mb-4 font-display text-lg font-semibold text-white">New venue</h2>
          <form action={createVenue} className="flex flex-col gap-4">
            <VenueFormFields organizations={organizations} />
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
