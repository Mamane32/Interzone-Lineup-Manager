import { getLiveMatch } from "@/lib/live-match";
import MatchHeaderPanel from "@/components/live/MatchHeaderPanel";
import StatusControls from "@/components/live/StatusControls";
import ScoreControl from "@/components/live/ScoreControl";
import EventControls from "@/components/live/EventControls";
import Timeline from "@/components/live/Timeline";
import StatisticsPanel from "@/components/live/StatisticsPanel";
import TeamPanels from "@/components/live/TeamPanels";
import BroadcastPanel from "@/components/live/BroadcastPanel";
import HighlightsIndex from "@/components/live/HighlightsIndex";
import QuickControlsBar from "@/components/live/QuickControlsBar";
import CenterTabs from "@/components/live/CenterTabs";

export const dynamic = "force-dynamic";

export default async function LiveControlRoomPage({ params }: { params: { matchId: string } }) {
  const bundle = await getLiveMatch(params.matchId);
  const { match, events, homePlayers, awayPlayers } = bundle;
  const status = match.live_status ?? "pre_match";

  return (
    <div className="flex flex-col gap-4">
      <MatchHeaderPanel bundle={bundle} />

      {/* Main Layout: Left Control Panel / Center Live Match Area / Right Timeline */}
      <div className="grid grid-cols-1 gap-4 lg:grid-cols-[280px_1fr_340px]">
        {/* Left Control Panel */}
        <div className="flex flex-col gap-4">
          <StatusControls matchId={match.id} current={status} />
          <ScoreControl
            matchId={match.id}
            homeTeam={match.home_team}
            awayTeam={match.away_team}
            homeScore={match.home_score ?? 0}
            awayScore={match.away_score ?? 0}
            homePlayers={homePlayers}
            awayPlayers={awayPlayers}
            events={events}
          />
          <EventControls
            matchId={match.id}
            homeTeam={match.home_team}
            awayTeam={match.away_team}
            homePlayers={homePlayers}
            awayPlayers={awayPlayers}
          />
        </div>

        {/* Center Live Match Area */}
        <div>
          <CenterTabs
            tabs={[
              { key: "stats", label: "Statistics", content: <StatisticsPanel homeTeam={match.home_team} awayTeam={match.away_team} /> },
              { key: "teams", label: "Teams", content: <TeamPanels bundle={bundle} /> },
              { key: "broadcast", label: "Broadcast", content: <BroadcastPanel /> },
              { key: "highlights", label: "Highlights", content: <HighlightsIndex bundle={bundle} /> },
            ]}
          />
        </div>

        {/* Right Timeline */}
        <div className="lg:min-h-[600px]">
          <Timeline
            matchId={match.id}
            events={events}
            homeTeam={match.home_team}
            awayTeam={match.away_team}
            homePlayers={homePlayers}
            awayPlayers={awayPlayers}
          />
        </div>
      </div>

      {/* Bottom Quick Controls */}
      <QuickControlsBar matchId={match.id} homeTeam={match.home_team} awayTeam={match.away_team} currentStatus={status} />
    </div>
  );
}
