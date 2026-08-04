"use client";

import { useMemo, useState } from "react";
import PresetManager from "./PresetManager";
import FormationVisualizations, { CoachPresentation } from "./FormationVisualizations";
import FormationAnimationPreview from "./FormationAnimationPreview";
import VMixExportPreview from "./VMixExportPreview";
import CenterTabs from "@/components/live/CenterTabs";
import FormationPitchEditor, { type FormationPitchEditorTeam } from "@/components/formation/FormationPitchEditor";
import BothTeamsPitchView from "@/components/formation/BothTeamsPitchView";
import { buildInitialPositions } from "@/lib/formation-engine";
import { getTheme } from "@/lib/team-theme";
import type { FormationPreset } from "@/lib/formation-presets";
import { saveFormation } from "@/app/live/[matchId]/formation/actions";
import type { PlacedPlayer } from "@/lib/formations";
import type { FormationName } from "@/lib/types";
import type { BrandingConfiguration } from "@/lib/branding";

type TeamSide = "home" | "away";
type TeamBundle = FormationPitchEditorTeam & { coachName: string; lineupSubmitted: boolean };

/**
 * Broadcast/Admin's own shell — the team-switcher and the four
 * Broadcast-only presentation tabs (Visualizations, Animation Preview,
 * Broadcast Preview, vMix Export) live here, not in the shared rendering
 * layer. The actual pitch/drag/save experience is
 * components/formation/FormationPitchEditor.tsx, composed below — this
 * file has no drag logic, no pitch markup, and no save-payload building of
 * its own anymore.
 *
 * `liveFormation`/`livePositions` mirror the editor's live state (via its
 * `onChange`) purely so the other four tabs — which read from the same
 * editing session but aren't part of the shared editor — have something
 * to render from. Coach's shell (app/team/[token]/(coach)/formation) has
 * no equivalent need and doesn't use this mirroring at all.
 */
export default function TacticalFormationBoard({
  matchId,
  home,
  away,
  branding,
  vmixConnected,
  vmixDetail,
  canEdit = true,
}: {
  matchId: string;
  home: TeamBundle;
  away: TeamBundle;
  branding: BrandingConfiguration;
  vmixConnected: boolean;
  vmixDetail?: string;
  /** False for a Broadcast-Operator viewer — strictly read-only per the Formation Engine's permission model: Broadcast never modifies formations, only Admin does. */
  canEdit?: boolean;
}) {
  const [side, setSide] = useState<TeamSide>("home");
  const team = side === "home" ? home : away;
  const theme = useMemo(() => getTheme(team.name), [team.name]);

  const initialFormation = team.saved.formation?.formation ?? "4-4-2";
  const [liveFormation, setLiveFormation] = useState<FormationName>(initialFormation);
  const [livePositions, setLivePositions] = useState<PlacedPlayer[]>(() => buildInitialPositions(team, initialFormation));
  const [presetToApply, setPresetToApply] = useState<{ formation: FormationName; positions: PlacedPlayer[] } | null>(null);

  function switchTeam(next: TeamSide) {
    const t = next === "home" ? home : away;
    const f = t.saved.formation?.formation ?? "4-4-2";
    setSide(next);
    setLiveFormation(f);
    setLivePositions(buildInitialPositions(t, f));
    setPresetToApply(null);
  }

  function recallPreset(preset: FormationPreset) {
    setPresetToApply({ formation: preset.formation, positions: preset.positions });
  }

  const substitutes = team.players.filter((p) => team.substituteIds.includes(p.id));

  // The "both teams on one pitch" broadcast graphic reads from each team's
  // confirmed (saved) formation, not the single side currently being
  // edited — a broadcaster shouldn't air an in-progress drag session for
  // whichever team isn't the active tab.
  const homeFormation = home.saved.formation?.formation ?? "4-4-2";
  const awayFormation = away.saved.formation?.formation ?? "4-4-2";
  const homeBroadcastPositions = useMemo(() => buildInitialPositions(home, homeFormation), [home, homeFormation]);
  const awayBroadcastPositions = useMemo(() => buildInitialPositions(away, awayFormation), [away, awayFormation]);
  const homeTheme = useMemo(() => getTheme(home.name), [home.name]);
  const awayTheme = useMemo(() => getTheme(away.name), [away.name]);
  const bothTeamsReady = homeBroadcastPositions.length === 11 && awayBroadcastPositions.length === 11;

  const tabs = [
    {
      key: "editor",
      label: "Editor",
      content: (
        <FormationPitchEditor
          key={team.id}
          team={team}
          theme={theme}
          canEdit={canEdit}
          onSave={(formation, positions) => saveFormation(matchId, team.id, formation, positions)}
          onChange={(f, p) => {
            setLiveFormation(f);
            setLivePositions(p);
          }}
          applyExternal={presetToApply}
          extraControls={<PresetManager matchId={matchId} teamId={team.id} formation={liveFormation} positions={livePositions} onRecall={recallPreset} />}
        />
      ),
    },
    ...(bothTeamsReady
      ? [
          {
            key: "broadcast-view",
            label: "Broadcast View",
            content: (
              <div className="flex flex-col gap-3">
                <p className="text-xs text-white/35">
                  Both teams&apos; confirmed lineups on one pitch, facing off across the halfway line — the on-air tactical overview.
                </p>
                <BothTeamsPitchView
                  home={{
                    name: home.name,
                    coachName: home.coachName,
                    formation: homeFormation,
                    theme: homeTheme,
                    logoUrl: null,
                    positions: homeBroadcastPositions,
                  }}
                  away={{
                    name: away.name,
                    coachName: away.coachName,
                    formation: awayFormation,
                    theme: awayTheme,
                    logoUrl: null,
                    positions: awayBroadcastPositions,
                  }}
                />
              </div>
            ),
          },
        ]
      : []),
    ...(livePositions.length > 0
      ? [
          {
            key: "visualizations",
            label: "Visualizations",
            content: (
              <FormationVisualizations teamName={team.name} formation={liveFormation} positions={livePositions} substitutes={substitutes} branding={branding} />
            ),
          },
          {
            key: "animation",
            label: "Animation Preview",
            content: <FormationAnimationPreview positions={livePositions} theme={theme} />,
          },
          {
            key: "broadcast-preview",
            label: "Broadcast Preview",
            content: (
              <div className="flex flex-col gap-3">
                <p className="text-xs text-white/35">Approximately what television viewers would see if this graphic went to air.</p>
                <CoachPresentation teamName={team.name} formation={liveFormation} positions={livePositions} theme={theme} branding={branding} />
              </div>
            ),
          },
          {
            key: "vmix-export",
            label: "vMix Export",
            content: (
              <VMixExportPreview teamName={team.name} formation={liveFormation} positions={livePositions} vmixConnected={vmixConnected} vmixDetail={vmixDetail} />
            ),
          },
        ]
      : []),
  ];

  return (
    <div className="flex flex-col gap-4">
      <div className="surface-panel flex flex-wrap items-center gap-3 p-3">
        <div className="flex rounded-xl bg-white/[0.03] p-1">
          {(["home", "away"] as const).map((s) => (
            <button
              key={s}
              onClick={() => switchTeam(s)}
              className={`rounded-lg px-4 py-2 text-sm font-semibold transition-colors ${
                side === s ? "bg-white text-black" : "text-white/50 hover:text-white"
              }`}
            >
              {s === "home" ? home.name : away.name}
            </button>
          ))}
        </div>
      </div>

      <CenterTabs tabs={tabs} />
    </div>
  );
}
