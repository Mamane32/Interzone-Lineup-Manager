"use client";

import { useState } from "react";
import UserStatusBadge from "@/components/iam/StatusBadge";
import ConfirmActionDialog from "@/components/iam/ConfirmActionDialog";
import Button from "@/components/ui/Button";
import Drawer from "@/components/foundation/Drawer";
import SeasonFormFields from "@/components/foundation/SeasonFormFields";
import { updateSeason, archiveSeason, activateSeason } from "@/app/admin/seasons/actions";
import type { Competition, Season } from "@/lib/types";

export default function SeasonRow({
  season,
  competitions,
  competitionName,
}: {
  season: Season;
  competitions: Competition[];
  competitionName: string;
}) {
  const [open, setOpen] = useState(false);

  return (
    <>
      <tr className="hover:bg-white/[0.03]">
        <td className="px-4 py-3 font-medium">{season.name}</td>
        <td className="px-4 py-3 text-white/40">{competitionName}</td>
        <td className="px-4 py-3 text-white/40">{season.year ?? "—"}</td>
        <td className="px-4 py-3">
          <UserStatusBadge status={season.status} />
        </td>
        <td className="px-4 py-3">
          <Button type="button" variant="secondary" size="md" onClick={() => setOpen(true)}>
            View
          </Button>
        </td>
      </tr>

      {open && (
        <Drawer title={season.name} subtitle={competitionName} onClose={() => setOpen(false)}>
          <form action={updateSeason.bind(null, season.id)} className="flex flex-col gap-4">
            <SeasonFormFields season={season} competitions={competitions} />
            <Button type="submit" className="w-fit">
              Save changes
            </Button>
          </form>

          <div className="mt-5 flex flex-wrap gap-2 border-t border-white/[0.08] pt-4">
            {season.status !== "active" && (
              <ConfirmActionDialog
                triggerLabel="Set as active season"
                title="Make this the active season?"
                body="Any other active season for this competition will be archived automatically — only one season can be active per competition."
                confirmLabel="Activate"
                action={activateSeason.bind(null, season.id)}
              />
            )}
            {season.status === "active" && (
              <ConfirmActionDialog
                triggerLabel="Archive season"
                triggerVariant="danger"
                title="Archive this season?"
                body="It will no longer be the competition's active season. Archived seasons remain read-only for historical reference."
                confirmLabel="Archive"
                action={archiveSeason.bind(null, season.id)}
              />
            )}
          </div>
        </Drawer>
      )}
    </>
  );
}
