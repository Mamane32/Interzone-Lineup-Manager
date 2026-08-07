import { requireRole } from "@/lib/access";
import { getLiveMatch } from "@/lib/live-match";
import { listProductionQueue } from "@/lib/broadcast/ProductionQueueEngine";
import ProductionOutputFrame from "@/components/broadcast-output/ProductionOutputFrame";
import OperatorHandoffNotice from "@/components/broadcast-output/OperatorHandoffNotice";

export const dynamic = "force-dynamic";

/**
 * Program (PGM) output — a separate top-level route (not nested under
 * /live/[matchId], which always renders BroadcastHeader's operator chrome
 * via its own layout) so this page is genuinely full-bleed, meant for a
 * vision mixer or a venue screen, not an operator. Gated the same as the
 * rest of the Broadcast Control Center — still an internal production
 * surface, just not a navigable module.
 */
export default async function ProgramOutputPage({ params }: { params: { matchId: string } }) {
  await requireRole(["broadcast_operator", "admin", "super_admin"]);
  const { match } = await getLiveMatch(params.matchId);
  const operator = match.broadcast_operator ?? "ggsp";
  if (operator !== "ggsp") return <OperatorHandoffNotice operator={operator} />;
  const items = await listProductionQueue(params.matchId);

  return (
    <ProductionOutputFrame
      matchId={params.matchId}
      mode="program"
      initialItems={items}
      homeTeamName={match.home_team.name}
      awayTeamName={match.away_team.name}
      homeScore={match.home_score ?? 0}
      awayScore={match.away_score ?? 0}
    />
  );
}
