import { getLiveMatch } from "@/lib/live-match";
import { getBaseBrandingAsync, withCompetition } from "@/lib/branding";
import { getVMixStatus } from "@/lib/vmix/client";
import { WebsiteSync } from "@/lib/broadcast/WebsiteSync";
import { listProductionQueue } from "@/lib/broadcast/ProductionQueueEngine";
import { listMatchStatistics } from "@/lib/match-statistics";
import { supabaseAdmin } from "@/lib/supabase-admin";
import type { Venue } from "@/lib/types";
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
import CollapsibleSection from "@/components/live/CollapsibleSection";

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
  const branding = withCompetition(await getBaseBrandingAsync(), match.competition);
  const vmixStatus = await getVMixStatus();
  const vmixState = connectionStateToSystemState(vmixStatus.state);
  const [websiteSyncStatus] = await WebsiteSync.getProvidersStatus();
  const websiteSyncState = connectionStateToSystemState(websiteSyncStatus.state);
  const graphicsQueue = await listProductionQueue(match.id, "graphics");
  const { data: venueRows } = await supabaseAdmin().from("venues").select("*").order("name");
  const venues = (venueRows ?? []) as Venue[];
  const statsRows = await listMatchStatistics(match.id);
  const homeStats = statsRows.find((s) => s.team_id === match.home_team_id);
  const awayStats = statsRows.find((s) => s.team_id === match.away_team_id);

  const scoreMeta = (
    <span className="font-display text-xs font-bold text-white/70">
      {match.home_score ?? 0}–{match.away_score ?? 0}
    </span>
  );

  return (
    <div className="flex flex-col gap-4">
      {/* Every large section below is individually collapsible, with its
          open/closed state remembered per browser (GGSP brief, Section 1C)
          — an operator on a phone shouldn't have to scroll past sections
          they already know they don't need for this match. */}
      <CollapsibleSection id="venue-officials" title="Venue & Officials">
        <MatchHeaderPanel bundle={bundle} branding={branding} venues={venues} />
      </CollapsibleSection>

      <CollapsibleSection id="score" title="Score" meta={scoreMeta}>
        <MatchScorePanel
          homeTeam={match.home_team}
          awayTeam={match.away_team}
          homeScore={match.home_score ?? 0}
          awayScore={match.away_score ?? 0}
          status={status}
          events={events}
        />
      </CollapsibleSection>

      {/* Match Controls / Live Video / Match Timeline */}
      <div className="grid grid-cols-1 gap-4 lg:grid-cols-[280px_1fr_340px]">
        <CollapsibleSection id="match-events" title="Match Events">
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
              status={status}
              events={events}
            />
            <EventControls
              matchId={match.id}
              homeTeam={match.home_team}
              awayTeam={match.away_team}
              homePlayers={homePlayers}
              awayPlayers={awayPlayers}
              status={status}
              events={events}
            />
          </div>
        </CollapsibleSection>

        <LiveVideoPanel status={status} />

        <CollapsibleSection id="timeline" title="Timeline">
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
        </CollapsibleSection>
      </div>

      {/* Statistics / Teams / Highlights  |  Graphics / Advertising / Production Status */}
      <div className="grid grid-cols-1 gap-4 lg:grid-cols-2">
        <CenterTabs
          tabs={[
            {
              key: "stats",
              label: "Statistics",
              content:
                homeStats && awayStats ? (
                  <StatisticsPanel matchId={match.id} homeTeam={match.home_team} awayTeam={match.away_team} homeStats={homeStats} awayStats={awayStats} />
                ) : (
                  <p className="p-4 text-xs text-white/30">Statistics rows haven&apos;t been created for this match yet.</p>
                ),
            },
            { key: "teams", label: "Teams", content: <TeamPanels bundle={bundle} /> },
            { key: "highlights", label: "Highlights", content: <HighlightsIndex bundle={bundle} /> },
          ]}
        />
        <CollapsibleSection id="production-graphics" title="Production & Graphics">
          <CenterTabs
            tabs={[
              { key: "broadcast", label: "Graphics", content: <BroadcastPanel matchId={match.id} items={graphicsQueue} /> },
              { key: "ads", label: "Advertising", content: <AdvertisingPanel /> },
              { key: "status", label: "Production Status", content: <ProductionStatusPanel vmixState={vmixState} websiteSyncState={websiteSyncState} /> },
            ]}
          />
        </CollapsibleSection>
      </div>

      {/* Quick Action Bar */}
      <QuickControlsBar
        matchId={match.id}
        homeTeam={match.home_team}
        awayTeam={match.away_team}
        homePlayers={homePlayers}
        awayPlayers={awayPlayers}
        status={status}
        events={events}
      />
    </div>
  );
}
