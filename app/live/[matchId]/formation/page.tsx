import { requireRole } from "@/lib/access";
import { getLiveMatch } from "@/lib/live-match";
import { getTacticalFormation } from "@/lib/tactical-formation";
import { getBaseBranding, withCompetition } from "@/lib/branding";
import { getVMixStatus } from "@/lib/vmix/client";
import PageHeader from "@/components/ui/PageHeader";
import TacticalFormationBoard from "@/components/live/formation/TacticalFormationBoard";

export const dynamic = "force-dynamic";

/**
 * Tactical Formation Panel — strictly private to the Broadcast Control
 * Center. Gated twice, deliberately: the layout above this page already
 * calls requireRole for every /live/[matchId]/** route, and this page
 * calls it again itself. Never reachable from the Coach Portal, the
 * public site, or any public API route — there is no code path into
 * app/live/[matchId]/formation/actions.ts from any of those surfaces.
 */
export default async function TacticalFormationPage({ params }: { params: { matchId: string } }) {
  const { role } = await requireRole(["broadcast_operator", "admin", "super_admin"]);
  // Broadcast is strictly read-only in the Formation Engine's permission
  // model — only admin/super_admin may save (see formation/actions.ts).
  const canEdit = role !== "broadcast_operator";

  const bundle = await getLiveMatch(params.matchId);
  const { match, homeLineup, awayLineup, homePlayers, awayPlayers } = bundle;
  const branding = withCompetition(getBaseBranding(), match.competition);

  const [savedHome, savedAway, vmixStatus] = await Promise.all([
    getTacticalFormation(params.matchId, match.home_team_id),
    getTacticalFormation(params.matchId, match.away_team_id),
    getVMixStatus(),
  ]);

  return (
    <div className="flex flex-col gap-6">
      <PageHeader
        eyebrow="Broadcast Control Center · Strictly private"
        title="Tactical Formation"
        description="Prepare each team's Starting XI on the pitch before kickoff — this feeds Starting XI graphics, team introduction, and match presentation."
      />

      <TacticalFormationBoard
        matchId={params.matchId}
        branding={branding}
        vmixConnected={vmixStatus.state === "connected"}
        vmixDetail={vmixStatus.state === "connected" ? `vMix ${vmixStatus.version ?? ""}`.trim() : vmixStatus.error}
        canEdit={canEdit}
        home={{
          id: match.home_team_id,
          name: match.home_team.name,
          players: homePlayers,
          startingXi: homeLineup?.starting_xi ?? [],
          substituteIds: homeLineup?.substitutes ?? [],
          captainId: homeLineup?.captain_id ?? null,
          lineupSubmitted: homeLineup?.status === "submitted",
          saved: savedHome,
        }}
        away={{
          id: match.away_team_id,
          name: match.away_team.name,
          players: awayPlayers,
          startingXi: awayLineup?.starting_xi ?? [],
          substituteIds: awayLineup?.substitutes ?? [],
          captainId: awayLineup?.captain_id ?? null,
          lineupSubmitted: awayLineup?.status === "submitted",
          saved: savedAway,
        }}
      />
    </div>
  );
}
