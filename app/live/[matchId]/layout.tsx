import { getLiveMatch } from "@/lib/live-match";
import { getBaseBranding, withCompetition } from "@/lib/branding";
import { getVMixStatus } from "@/lib/vmix/client";
import { WebsiteSync } from "@/lib/broadcast/WebsiteSync";
import { getTacticalFormation } from "@/lib/tactical-formation";
import { buildReadinessReport, teamReadinessFromData } from "@/lib/readiness";
import { requireRole } from "@/lib/access";
import BroadcastHeader from "@/components/live/BroadcastHeader";
import { connectionStateToSystemState } from "@/components/live/vmix-status";

export const dynamic = "force-dynamic";

export default async function BroadcastControlCenterLayout({
  children,
  params,
}: {
  children: React.ReactNode;
  params: { matchId: string };
}) {
  const { role } = await requireRole(["broadcast_operator", "admin", "super_admin"]);
  const homeHref = role === "admin" || role === "super_admin" ? "/admin/dashboard" : "/live";
  const { match, homeLineup, awayLineup } = await getLiveMatch(params.matchId);
  const branding = withCompetition(getBaseBranding(), match.competition);

  const [vmixStatus, websiteSyncStatuses, homeFormation, awayFormation] = await Promise.all([
    getVMixStatus(),
    WebsiteSync.getProvidersStatus(),
    getTacticalFormation(params.matchId, match.home_team_id),
    getTacticalFormation(params.matchId, match.away_team_id),
  ]);

  const readiness = buildReadinessReport({
    matchId: params.matchId,
    competitionId: match.competition_id,
    refereeName: match.referee_name ?? null,
    home: teamReadinessFromData({
      lineupStatus: homeLineup?.status,
      formation: homeFormation.formation,
      positions: homeFormation.positions,
      substituteCount: homeLineup?.substitutes.length ?? 0,
    }),
    away: teamReadinessFromData({
      lineupStatus: awayLineup?.status,
      formation: awayFormation.formation,
      positions: awayFormation.positions,
      substituteCount: awayLineup?.substitutes.length ?? 0,
    }),
    vmixConnected: vmixStatus.state === "connected",
    websiteSyncConnected: websiteSyncStatuses[0]?.state === "connected",
  });

  return (
    <div className="min-h-screen bg-surface-950 text-white">
      <BroadcastHeader
        branding={branding}
        homeHref={homeHref}
        matchToken={params.matchId}
        homeTeamName={match.home_team.name}
        awayTeamName={match.away_team.name}
        status={match.live_status ?? "pre_match"}
        round={match.round}
        homeLineupStatus={homeLineup?.status ?? null}
        awayLineupStatus={awayLineup?.status ?? null}
        vmixState={connectionStateToSystemState(vmixStatus.state)}
        readiness={readiness}
      />
      <main className="mx-auto max-w-[1600px] px-4 py-4">{children}</main>
    </div>
  );
}
