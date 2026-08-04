import { ChevronRight, Zap } from "lucide-react";
import { PRODUCTION_LIFECYCLE, type ProductionPhase } from "@/lib/production-lifecycle";
import { PLANNED_AUTOMATION_HOOKS } from "@/lib/broadcast/automation-hooks";

/** Post-Game Workflow (preparation only) + Future Automation reference — both documented extension points, nothing here executes. */
export default function ProductionLifecycle({ currentPhase }: { currentPhase: ProductionPhase }) {
  return (
    <div className="flex flex-col gap-4">
      <div className="surface-panel p-4">
        <p className="mb-3 text-xs font-semibold uppercase tracking-wide text-white/40">Production Lifecycle</p>
        <div className="flex flex-wrap items-center gap-1.5">
          {PRODUCTION_LIFECYCLE.map((phase, i) => (
            <div key={phase.phase} className="flex items-center gap-1.5">
              <span
                title={phase.detail}
                className={`rounded-full px-2.5 py-1 text-[11px] font-semibold ${
                  phase.phase === currentPhase
                    ? "bg-brand-400 text-surface-950"
                    : phase.implemented
                      ? "bg-white/5 text-white/50"
                      : "bg-white/[0.02] text-white/20"
                }`}
              >
                {phase.label}
                {!phase.implemented && <span className="ml-1 text-[8px] uppercase">Planned</span>}
              </span>
              {i < PRODUCTION_LIFECYCLE.length - 1 && <ChevronRight size={12} className="text-white/15" />}
            </div>
          ))}
        </div>
      </div>

      <div className="surface-panel p-4">
        <p className="mb-1 flex items-center gap-2 text-xs font-semibold uppercase tracking-wide text-white/40">
          <Zap size={13} /> Future Automation
        </p>
        <p className="mb-3 text-[11px] text-white/25">Extension points, not automations — none of these run anything yet.</p>
        <div className="flex flex-col gap-1.5">
          {PLANNED_AUTOMATION_HOOKS.map((hook) => (
            <div key={hook.key} className="flex items-center justify-between gap-3 rounded-lg bg-white/[0.02] px-3 py-2 text-xs">
              <span className="text-white/50">{hook.label}</span>
              <span className="truncate text-right text-[10px] text-white/20">{hook.trigger}</span>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
