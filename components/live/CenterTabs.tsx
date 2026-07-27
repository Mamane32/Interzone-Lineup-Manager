"use client";

import { useState } from "react";

export default function CenterTabs({
  tabs,
}: {
  tabs: { key: string; label: string; content: React.ReactNode }[];
}) {
  const [active, setActive] = useState(tabs[0]?.key);
  const activeTab = tabs.find((t) => t.key === active) ?? tabs[0];

  return (
    <div>
      <div className="mb-3 flex gap-1 rounded-xl bg-white/[0.03] p-1">
        {tabs.map((t) => (
          <button
            key={t.key}
            onClick={() => setActive(t.key)}
            className={`flex-1 rounded-lg px-3 py-2 text-xs font-semibold transition-colors ${
              t.key === activeTab?.key ? "bg-white text-black" : "text-white/50 hover:text-white"
            }`}
          >
            {t.label}
          </button>
        ))}
      </div>
      <div className="animate-fade-up">{activeTab?.content}</div>
    </div>
  );
}
