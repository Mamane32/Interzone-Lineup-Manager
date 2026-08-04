import { requireRole } from "@/lib/access";
import { getLiveMatch } from "@/lib/live-match";
import { listProductionQueue } from "@/lib/broadcast/ProductionQueueEngine";
import ProductionOutputFrame from "@/components/broadcast-output/ProductionOutputFrame";

export const dynamic = "force-dynamic";

/** Preview (PVW) output — see app/broadcast-output/[matchId]/program/page.tsx's doc comment; identical shell, shows the next queued item instead of the live one. */
export default async function PreviewOutputPage({ params }: { params: { matchId: string } }) {
  await requireRole(["broadcast_operator", "admin", "super_admin"]);
  const { match } = await getLiveMatch(params.matchId);
  const items = await listProductionQueue(params.matchId);

  return (
    <ProductionOutputFrame
      matchId={params.matchId}
      mode="preview"
      initialItems={items}
      homeTeamName={match.home_team.name}
      awayTeamName={match.away_team.name}
      homeScore={match.home_score ?? 0}
      awayScore={match.away_score ?? 0}
    />
  );
}
