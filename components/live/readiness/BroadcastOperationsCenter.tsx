import BroadcastReadinessCenter from "./BroadcastReadinessCenter";
import GoLiveButton from "./GoLiveButton";
import ProductionTimeline from "./ProductionTimeline";
import MissionControlGrid from "./MissionControlGrid";
import ProductionLifecycle from "./ProductionLifecycle";
import type { ReadinessReport } from "@/lib/readiness";
import type { TimelineEntry } from "@/lib/production-timeline";
import type { BroadcastSubsystem } from "@/lib/broadcast/BroadcastSession";
import type { ProductionPhase } from "@/lib/production-lifecycle";

/**
 * Broadcast Operations Center — NASA-Mission-Control-style command center
 * for one match's entire production. Everything on one screen, nothing
 * behind a tab: the whole point is "understandable in under five seconds,"
 * which a tab strip works against.
 */
export default function BroadcastOperationsCenter({
  matchId,
  report,
  timeline,
  subsystems,
  currentPhase,
}: {
  matchId: string;
  report: ReadinessReport;
  timeline: TimelineEntry[];
  subsystems: BroadcastSubsystem[];
  currentPhase: ProductionPhase;
}) {
  return (
    <div className="flex flex-col gap-4">
      <GoLiveButton matchId={matchId} canGoLive={report.canGoLive} blockingChecks={report.blockingChecks} />

      <BroadcastReadinessCenter report={report} matchId={matchId} />

      <div className="grid gap-4 lg:grid-cols-2">
        <MissionControlGrid subsystems={subsystems} />
        <ProductionTimeline entries={timeline} />
      </div>

      <ProductionLifecycle currentPhase={currentPhase} />
    </div>
  );
}
