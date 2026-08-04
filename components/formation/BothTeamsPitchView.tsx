import PitchMarkings from "./PitchMarkings";
import PlayerToken from "./PlayerToken";
import type { PlacedPlayer } from "@/lib/formations";
import type { FormationName } from "@/lib/types";
import type { Theme } from "@/lib/team-theme";

export type PitchTeamSummary = {
  name: string;
  coachName: string;
  formation: FormationName;
  theme: Theme;
  logoUrl: string | null;
  positions: PlacedPlayer[];
};

/**
 * Presentation-ready "both teams on one pitch" graphic — the Phase 4
 * Broadcast review's Formation gap: every other Formation view (Editor,
 * Visualizations, Animation, Broadcast Preview) shows one team at a time.
 * Built entirely on the shared rendering layer (PitchMarkings, PlayerToken)
 * — no new pitch, no new player-token rendering, no duplicated logic. The
 * only thing genuinely new here is the coordinate transform that compresses
 * each team's own full-pitch positions into their half of one shared pitch,
 * facing each other across the halfway line — a real football lineup
 * graphic, not two pitches side by side.
 *
 * Deliberately presentation-only (no drag, no save) so it's safe to reuse
 * as-is from the Graphics Engine, Live Center, Match Reports, or a future
 * PNG/social export — every one of those wants a read-only picture, not an
 * editor.
 */
export default function BothTeamsPitchView({ home, away }: { home: PitchTeamSummary; away: PitchTeamSummary }) {
  const homeTokens = home.positions.map((p) => ({ ...p, y: 100 - p.y / 2 }));
  const awayTokens = away.positions.map((p) => ({ ...p, y: p.y / 2 }));

  return (
    <div className="flex flex-col gap-3">
      <div className="grid grid-cols-2 gap-3 text-center">
        <TeamCaption team={away} />
        <TeamCaption team={home} align="right" />
      </div>

      <div className="surface-panel relative mx-auto aspect-[2/3] w-full max-w-2xl touch-none overflow-hidden p-0">
        <PitchMarkings />

        {/* Halfway line emphasis — the seam between the two teams' halves. */}
        <div className="pointer-events-none absolute left-0 right-0 top-1/2 h-px bg-white/25" />

        {awayTokens.map((p) => (
          <PlayerToken key={`away-${p.playerId}`} player={p} theme={away.theme} dragging={false} onPointerDown={() => {}} onClick={() => {}} />
        ))}
        {homeTokens.map((p) => (
          <PlayerToken key={`home-${p.playerId}`} player={p} theme={home.theme} dragging={false} onPointerDown={() => {}} onClick={() => {}} />
        ))}
      </div>
    </div>
  );
}

function TeamCaption({ team, align = "left" }: { team: PitchTeamSummary; align?: "left" | "right" }) {
  return (
    <div className={`flex flex-col ${align === "right" ? "items-end text-right" : "items-start text-left"}`}>
      <p className={`font-display text-sm font-bold ${team.theme.chipText}`}>{team.name}</p>
      <p className="text-[11px] text-white/40">{team.formation === "custom" ? "Custom" : team.formation}</p>
      <p className="text-[10px] text-white/25">Coach: {team.coachName}</p>
    </div>
  );
}
