"use client";

import { useEffect, useState } from "react";

function getParts(target: number) {
  const diff = Math.max(0, target - Date.now());
  const days = Math.floor(diff / 86400000);
  const hours = Math.floor((diff % 86400000) / 3600000);
  const minutes = Math.floor((diff % 3600000) / 60000);
  const seconds = Math.floor((diff % 60000) / 1000);
  return { days, hours, minutes, seconds, done: diff <= 0 };
}

export default function CountdownTimer({ targetISO }: { targetISO: string }) {
  const target = new Date(targetISO).getTime();
  const [parts, setParts] = useState(() => getParts(target));

  useEffect(() => {
    const id = setInterval(() => setParts(getParts(target)), 1000);
    return () => clearInterval(id);
  }, [target]);

  if (parts.done) {
    return <p className="font-display text-lg font-semibold text-amber-signal">Match la kòmanse</p>;
  }

  const cells = [
    { value: parts.days, label: "jou" },
    { value: parts.hours, label: "è" },
    { value: parts.minutes, label: "min" },
    { value: parts.seconds, label: "sek" },
  ];

  return (
    <div className="flex gap-3">
      {cells.map((c) => (
        <div key={c.label} className="flex flex-col items-center">
          <span className="font-display text-2xl font-semibold tabular-nums text-white">
            {String(c.value).padStart(2, "0")}
          </span>
          <span className="text-[10px] uppercase tracking-wide text-white/40">{c.label}</span>
        </div>
      ))}
    </div>
  );
}
