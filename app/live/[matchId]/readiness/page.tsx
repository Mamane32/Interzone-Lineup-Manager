import { requireRole } from "@/lib/access";
import { getLiveMatch } from "@/lib/live-match";
import { getTacticalFormation } from "@/lib/tactical-formation";
import { BroadcastEngine } from "@/lib/broadcast/BroadcastEngine";
import { WebsiteSync } from "@/lib/broadcast/WebsiteSync";
import { getBroadcastSession } from "@/lib/broadcast/BroadcastSession";
import { buildReadinessReport, teamReadinessFromData } from "@/lib/readiness";
import { buildProductionTimeline, getRefereeAssignedAt } from "@/lib/production-timeline";
import { matchLiveStatusToPhase } from "@/lib/production-lifecycle";
import PageHeader from "@/components/ui/PageHeader";
import BroadcastOperationsCenter from "@/components/live/readiness/BroadcastOperationsCenter";

export const dynamic = "force-dynamic";

/**
 * Broadcast Operations Center — strictly the Broadcast Control Center,
 * gated the same way as every other /live/[matchId]/** route.
 */
export default async function ReadinessPage({ params }: { params: { matchId: string } }) {
  await requireRole(["broadcast_operator", "admin", "super_admin"]);

  const bundle = await getLiveMatch(params.matchId);
  const { match, homeLineup, awayLineup } = bundle;

  const [homeFormation, awayFormation, vmixStatus, websiteSyncStatuses, session, refereeAssignedAt] = await Promise.all([
    getTacticalFormation(params.matchId, match.home_team_id),
    getTacticalFormation(params.matchId, match.away_team_id),
    BroadcastEngine.getSystemStatus("vmix"),
    WebsiteSync.getProvidersStatus(),
    getBroadcastSession(params.matchId),
    getRefereeAssignedAt(params.matchId),
  ]);

  const report = buildReadinessReport({
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

  const timeline = buildProductionTimeline({
    matchCreatedAt: match.created_at,
    refereeAssignedAt,
    homeLineupSubmittedAt: homeLineup?.submitted_at ?? null,
    awayLineupSubmittedAt: awayLineup?.submitted_at ?? null,
    homeFormationSavedAt: homeFormation.formation?.created_at ?? null,
    awayFormationSavedAt: awayFormation.formation?.created_at ?? null,
    broadcastReady: report.matchdayStatus === "ready",
  });

  return (
    <div className="flex flex-col gap-6">
      <PageHeader
        eyebrow="Broadcast Control Center"
        title="Broadcast Operations Center"
        description="The command center for this match's entire production — what's ready, what's missing, what's blocking kickoff."
      />

      <BroadcastOperationsCenter
        matchId={params.matchId}
        report={report}
        timeline={timeline}
        subsystems={session.subsystems}
        currentPhase={matchLiveStatusToPhase(match.live_status ?? "pre_match")}
      />
    </div>
  );
}
