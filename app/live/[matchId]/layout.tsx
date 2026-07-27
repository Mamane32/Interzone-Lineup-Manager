import { getLiveMatch } from "@/lib/live-match";
import { getBaseBranding, withCompetition } from "@/lib/branding";
import { requireRole } from "@/lib/access";
import BroadcastHeader from "@/components/live/BroadcastHeader";

export const dynamic = "force-dynamic";

export default async function BroadcastControlCenterLayout({
  children,
  params,
}: {
  children: React.ReactNode;
  params: { matchId: string };
}) {
  await requireRole(["broadcast_operator", "admin", "super_admin"]);
  const { match } = await getLiveMatch(params.matchId);
  const branding = withCompetition(getBaseBranding(), match.competition);

  return (
    <div className="min-h-screen bg-[#05070a] text-white">
      <BroadcastHeader
        branding={branding}
        matchToken={params.matchId}
        homeTeamName={match.home_team.name}
        awayTeamName={match.away_team.name}
        status={match.live_status ?? "pre_match"}
        round={match.round}
      />
      <main className="mx-auto max-w-[1600px] px-4 py-4">{children}</main>
    </div>
  );
}
