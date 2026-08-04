"use client";

import { useEffect, useState } from "react";

function getParts(target: number) {
  const diff = Math.max(0, target - Date.now());
  return {
    days: Math.floor(diff / 86_400_000),
    hours: Math.floor((diff % 86_400_000) / 3_600_000),
    minutes: Math.floor((diff % 3_600_000) / 60_000),
    seconds: Math.floor((diff % 60_000) / 1_000),
    done: diff <= 0,
  };
}

/** English, admin-console styled countdown — the Coach Portal's CountdownTimer is Creole-labeled and belongs to that surface, not this one. */
export default function MatchCountdown({ targetISO }: { targetISO: string }) {
  const target = new Date(targetISO).getTime();
  const [parts, setParts] = useState(() => getParts(target));

  useEffect(() => {
    const id = setInterval(() => setParts(getParts(target)), 1000);
    return () => clearInterval(id);
  }, [target]);

  if (parts.done) {
    return <p className="font-display text-lg font-semibold text-brand-400">Kickoff underway</p>;
  }

  const cells = [
    { value: parts.days, label: "days" },
    { value: parts.hours, label: "hrs" },
    { value: parts.minutes, label: "min" },
    { value: parts.seconds, label: "sec" },
  ];

  return (
    <div className="flex gap-3">
      {cells.map((c) => (
        <div key={c.label} className="flex flex-col items-center">
          <span className="font-display text-3xl font-semibold tabular-nums text-white">{String(c.value).padStart(2, "0")}</span>
          <span className="text-[10px] uppercase tracking-wide text-white/35">{c.label}</span>
        </div>
      ))}
    </div>
  );
}
