import { getLiveMatch } from "@/lib/live-match";
import { getBaseBranding, withCompetition } from "@/lib/branding";
import { getVMixStatus } from "@/lib/vmix/client";
import { WebsiteSync } from "@/lib/broadcast/WebsiteSync";
import { connectionStateToSystemState } from "@/components/live/vmix-status";
import MatchHeaderPanel from "@/components/live/MatchHeaderPanel";
import MatchScorePanel from "@/components/live/MatchScorePanel";
import StatusControls from "@/components/live/StatusControls";
import ScoreControl from "@/components/live/ScoreControl";
import EventControls from "@/components/live/EventControls";
import LiveVideoPanel from "@/components/live/LiveVideoPanel";
import Timeline from "@/components/live/Timeline";
import StatisticsPanel from "@/components/live/StatisticsPanel";
import TeamPanels from "@/components/live/TeamPanels";
import BroadcastPanel from "@/components/live/BroadcastPanel";
import HighlightsIndex from "@/components/live/HighlightsIndex";
import AdvertisingPanel from "@/components/live/AdvertisingPanel";
import ProductionStatusPanel from "@/components/live/ProductionStatusPanel";
import QuickControlsBar from "@/components/live/QuickControlsBar";
import CenterTabs from "@/components/live/CenterTabs";

export const dynamic = "force-dynamic";

/**
 * Main Broadcast Control Center layout, per the brief's ASCII diagram:
 *
 *   MATCH HEADER (context + score)
 *   ─────────────────────────────────────────────
 *   MATCH CONTROLS │ LIVE VIDEO │ MATCH TIMELINE
 *   ─────────────────────────────────────────────
 *   Statistics/Teams/Highlights │ Broadcast/Ads/Status
 *   ─────────────────────────────────────────────
 *   Quick Action Bar
 *
 * The two bottom zones are tabbed rather than fixed single panels — the
 * brief asks for 7+ distinct secondary panels (Statistics, Teams,
 * Highlights, Broadcast Graphics, Advertising, Production Status), and a
 * fixed two-column layout with all of them visible at once would be
 * exactly the "cluttered admin dashboard" feeling this sprint explicitly
 * moves away from. Tabbed multiviewer panels are the standard pattern in
 * real production consoles.
 */
export default async function LiveControlRoomPage({ params }: { params: { matchId: string } }) {
  const bundle = await getLiveMatch(params.matchId);
  const { match, events, homePlayers, awayPlayers } = bundle;
  const status = match.live_status ?? "pre_match";
  const branding = withCompetition(getBaseBranding(), match.competition);
  const vmixStatus = await getVMixStatus();
  const vmixState = connectionStateToSystemState(vmixStatus.state);
  const [websiteSyncStatus] = await WebsiteSync.getProvidersStatus();
  const websiteSyncState = connectionStateToSystemState(websiteSyncStatus.state);

  return (
    <div className="flex flex-col gap-4">
      <MatchHeaderPanel bundle={bundle} branding={branding} />
      <MatchScorePanel
        homeTeam={match.home_team}
        awayTeam={match.away_team}
        homeScore={match.home_score ?? 0}
        awayScore={match.away_score ?? 0}
        status={status}
        events={events}
      />

      {/* Match Controls / Live Video / Match Timeline */}
      <div className="grid grid-cols-1 gap-4 lg:grid-cols-[280px_1fr_340px]">
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

        <LiveVideoPanel status={status} />

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

      {/* Statistics / Teams / Highlights  |  Broadcast / Advertising / Production Status */}
      <div className="grid grid-cols-1 gap-4 lg:grid-cols-2">
        <CenterTabs
          tabs={[
            { key: "stats", label: "Statistics", content: <StatisticsPanel homeTeam={match.home_team} awayTeam={match.away_team} /> },
            { key: "teams", label: "Teams", content: <TeamPanels bundle={bundle} /> },
            { key: "highlights", label: "Highlights", content: <HighlightsIndex bundle={bundle} /> },
          ]}
        />
        <CenterTabs
          tabs={[
            { key: "broadcast", label: "Broadcast", content: <BroadcastPanel /> },
            { key: "ads", label: "Advertising", content: <AdvertisingPanel /> },
            { key: "status", label: "Production Status", content: <ProductionStatusPanel vmixState={vmixState} websiteSyncState={websiteSyncState} /> },
          ]}
        />
      </div>

      {/* Quick Action Bar */}
      <QuickControlsBar
        matchId={match.id}
        homeTeam={match.home_team}
        awayTeam={match.away_team}
        homePlayers={homePlayers}
        awayPlayers={awayPlayers}
      />
    </div>
  );
}
