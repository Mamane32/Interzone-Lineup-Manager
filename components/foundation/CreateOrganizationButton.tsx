"use client";

import { useState } from "react";
import Button from "@/components/ui/Button";
import Modal from "@/components/foundation/Modal";
import OrganizationFormFields from "@/components/foundation/OrganizationFormFields";
import { createOrganization } from "@/app/admin/organizations/actions";

export default function CreateOrganizationButton() {
  const [open, setOpen] = useState(false);

  return (
    <>
      <Button type="button" onClick={() => setOpen(true)}>
        New organization
      </Button>

      {open && (
        <Modal onClose={() => setOpen(false)}>
          <h2 className="mb-4 font-display text-lg font-semibold text-white">New organization</h2>
          <form action={createOrganization} className="flex flex-col gap-4">
            <OrganizationFormFields />
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
