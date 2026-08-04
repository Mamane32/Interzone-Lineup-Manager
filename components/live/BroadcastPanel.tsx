"use client";

import { useState, useTransition } from "react";
import SectionHeader from "./SectionHeader";
import BroadcastGraphicCard, { type GraphicStatus } from "./BroadcastGraphicCard";
import { takeCatalogGraphic, hideQueueItem } from "@/app/live/[matchId]/production-queue-actions";
import type { ProductionQueueItem } from "@/lib/broadcast/ProductionQueueEngine";

const CATEGORIES: { key: string; label: string; items: string[] }[] = [
  { key: "pre", label: "Pre-Match", items: ["Match Intro", "Team Logos", "Starting Lineup", "Formation", "Referees", "Coaches", "Next Match"] },
  {
    key: "in",
    label: "In-Match",
    items: [
      "Scoreboard",
      "Lower Third",
      "Goal",
      "Yellow Card",
      "Red Card",
      "Substitution",
      "VAR Review",
      "Penalty",
      "Injury",
      "Player Comparison",
      "Match Statistics",
      "Additional Time",
    ],
  },
  { key: "post", label: "Post-Match", items: ["Full-Time Score", "Player of the Match", "Final Statistics", "Next Fixture"] },
];

/**
 * Broadcast Graphics Panel — categorized production controls (Pre/In/Post-
 * Match), per the brief. Graphics is the first real consumer of the
 * generic Production Queue Engine (lib/broadcast/ProductionQueueEngine.ts)
 * — Take/Hide are real, persisted state (`items` is read fresh from
 * `production_queue` on every render, the same server-driven pattern
 * every other live page uses), not local component state. Only one
 * graphic can be "Live" at a time, matching how a real production
 * switcher works — the engine itself enforces this per consumer, taking
 * a new one automatically hides whichever was live before it.
 */
export default function BroadcastPanel({ matchId, items }: { matchId: string; items: ProductionQueueItem[] }) {
  const [activeTab, setActiveTab] = useState(CATEGORIES[1].key);
  const [pending, startTransition] = useTransition();

  const category = CATEGORIES.find((c) => c.key === activeTab) ?? CATEGORIES[0];
  const liveItem = items.find((i) => i.status === "live") ?? null;

  function statusFor(item: string): GraphicStatus {
    return liveItem?.itemKey === item ? "live" : "ready";
  }

  function take(categoryKey: string, item: string) {
    startTransition(() => {
      takeCatalogGraphic(matchId, categoryKey, item, item);
    });
  }

  function hide() {
    if (!liveItem) return;
    startTransition(() => {
      hideQueueItem(matchId, liveItem.id);
    });
  }

  return (
    <div className="surface-panel p-4">
      <SectionHeader
        title="Broadcast Graphics"
        badge={<span className="rounded-full bg-white/5 px-2 py-0.5 text-[10px] text-white/30">vMix / UTC not connected</span>}
      />

      <div className="mb-3 flex gap-1 rounded-lg bg-white/[0.03] p-1">
        {CATEGORIES.map((c) => (
          <button
            key={c.key}
            onClick={() => setActiveTab(c.key)}
            className={`flex-1 rounded-md px-2 py-1.5 text-[11px] font-semibold transition-colors ${
              c.key === activeTab ? "bg-white text-black" : "text-white/50 hover:text-white"
            }`}
          >
            {c.label}
          </button>
        ))}
      </div>

      <div className="grid grid-cols-1 gap-1.5 sm:grid-cols-2">
        {category.items.map((item) => (
          <BroadcastGraphicCard
            key={item}
            name={item}
            status={statusFor(item)}
            onTake={() => take(category.key, item)}
            onHide={hide}
          />
        ))}
      </div>
      {pending && <p className="mt-2 text-[10px] text-white/25">Updating...</p>}
    </div>
  );
}
