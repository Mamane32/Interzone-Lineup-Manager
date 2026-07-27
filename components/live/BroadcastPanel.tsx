"use client";

import { useState } from "react";
import SectionHeader from "./SectionHeader";
import BroadcastGraphicCard, { type GraphicStatus } from "./BroadcastGraphicCard";

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
      "Player Comparison",
      "Match Statistics",
      "Additional Time",
    ],
  },
  { key: "post", label: "Post-Match", items: ["Full-Time Score", "Player of the Match", "Final Statistics", "Next Fixture"] },
];

/**
 * Broadcast Graphics Panel — categorized production controls (Pre/In/Post-
 * Match), per the brief. These are UI placeholders for a future vMix/UTC
 * integration: "live" state is local component state only, nothing is
 * persisted or sent anywhere. Only one graphic can be "Live" at a time,
 * matching how a real production switcher works — taking a new graphic
 * automatically hides whichever one was live before it.
 */
export default function BroadcastPanel() {
  const [liveItem, setLiveItem] = useState<string | null>(null);
  const [activeTab, setActiveTab] = useState(CATEGORIES[1].key);

  const category = CATEGORIES.find((c) => c.key === activeTab) ?? CATEGORIES[0];

  function statusFor(item: string): GraphicStatus {
    if (liveItem === item) return "live";
    return "ready";
  }

  return (
    <div className="rounded-2xl border border-white/10 bg-white/[0.03] p-4">
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
            onTake={() => setLiveItem(item)}
            onHide={() => setLiveItem((cur) => (cur === item ? null : cur))}
          />
        ))}
      </div>
    </div>
  );
}
