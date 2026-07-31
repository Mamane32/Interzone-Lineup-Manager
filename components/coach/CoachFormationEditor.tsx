"use client";

import { Lock } from "lucide-react";
import FormationPitchEditor, { type FormationPitchEditorTeam } from "@/components/formation/FormationPitchEditor";
import { saveTeamFormation } from "@/app/team/[token]/actions";
import type { Theme } from "@/lib/team-theme";

/**
 * Coach's shell around the shared Formation Engine rendering layer — no
 * team-switcher (a coach has exactly one team), no Broadcast-only tabs
 * (Visualizations/Animation/vMix Export make sense for a broadcast
 * operator preparing graphics, not for a coach placing their own XI).
 * Just the pitch, the formation selector, and Save.
 */
export default function CoachFormationEditor({
  token,
  matchId,
  team,
  theme,
  locked,
}: {
  token: string;
  matchId: string;
  team: FormationPitchEditorTeam;
  theme: Theme;
  locked: boolean;
}) {
  return (
    <div className="flex flex-col gap-3">
      {locked && (
        <p className="flex items-center gap-2 rounded-lg bg-ink/5 px-3 py-2 text-xs font-medium text-ink/50">
          <Lock size={13} /> Lis ekip la deja soumèt e fèmen — fòmasyon an pa ka chanje ankò.
        </p>
      )}
      <FormationPitchEditor
        team={team}
        theme={theme}
        canEdit={!locked}
        onSave={(formation, positions) => saveTeamFormation(token, matchId, formation, positions)}
        emptyStateHint="Soumèt lis 11 titilè ou yo anvan — fòmasyon an plase yo otomatikman yon fwa yo soumèt."
      />
    </div>
  );
}
