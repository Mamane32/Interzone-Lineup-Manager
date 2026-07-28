"use client";

import { useState } from "react";
import { MapPin } from "lucide-react";
import UserStatusBadge from "@/components/iam/StatusBadge";
import ConfirmActionDialog from "@/components/iam/ConfirmActionDialog";
import Button from "@/components/ui/Button";
import Drawer from "@/components/foundation/Drawer";
import VenueFormFields from "@/components/foundation/VenueFormFields";
import { updateVenue, setVenueStatus } from "@/app/admin/venues/actions";
import type { Organization, Venue } from "@/lib/types";

export default function VenueRow({
  venue,
  organizations,
  organizationName,
}: {
  venue: Venue;
  organizations: Organization[];
  organizationName: string;
}) {
  const [open, setOpen] = useState(false);

  return (
    <>
      <tr className="hover:bg-white/[0.03]">
        <td className="px-4 py-3 font-medium">{venue.name}</td>
        <td className="px-4 py-3 text-ink-muted">{[venue.city, venue.country].filter(Boolean).join(", ") || "—"}</td>
        <td className="px-4 py-3 text-ink-muted">{organizationName}</td>
        <td className="px-4 py-3 text-ink-muted">{venue.capacity ?? "—"}</td>
        <td className="px-4 py-3">
          <UserStatusBadge status={venue.status} />
        </td>
        <td className="px-4 py-3">
          <Button type="button" variant="secondary" size="md" onClick={() => setOpen(true)}>
            View
          </Button>
        </td>
      </tr>

      {open && (
        <Drawer title={venue.name} subtitle={venue.city ?? undefined} onClose={() => setOpen(false)}>
          {venue.google_maps_url && (
            <a
              href={venue.google_maps_url}
              target="_blank"
              rel="noreferrer"
              className="mb-4 flex items-center gap-1.5 text-sm text-amber-signal hover:underline"
            >
              <MapPin size={14} /> Open in Google Maps
            </a>
          )}
          <form action={updateVenue.bind(null, venue.id)} className="flex flex-col gap-4">
            <VenueFormFields venue={venue} organizations={organizations} />
            <Button type="submit" className="w-fit">
              Save changes
            </Button>
          </form>

          <div className="mt-5 border-t border-ink-line pt-4">
            {venue.status === "active" ? (
              <ConfirmActionDialog
                triggerLabel="Archive venue"
                triggerVariant="danger"
                title="Archive this venue?"
                body="Archived venues are hidden from active lists but not deleted, and can be restored anytime."
                confirmLabel="Archive"
                action={setVenueStatus.bind(null, venue.id, "archived")}
              />
            ) : (
              <ConfirmActionDialog
                triggerLabel="Restore venue"
                title="Restore this venue?"
                body="It will reappear in active lists immediately."
                confirmLabel="Restore"
                action={setVenueStatus.bind(null, venue.id, "active")}
              />
            )}
          </div>
        </Drawer>
      )}
    </>
  );
}
