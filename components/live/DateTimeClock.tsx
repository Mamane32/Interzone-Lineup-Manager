"use client";

import { useEffect, useState } from "react";

export default function DateTimeClock() {
  const [now, setNow] = useState<Date | null>(null);

  useEffect(() => {
    setNow(new Date());
    const id = setInterval(() => setNow(new Date()), 1000 * 30);
    return () => clearInterval(id);
  }, []);

  if (!now) return <span className="text-[11px] text-white/30">—</span>;

  return (
    <span className="text-[11px] tabular-nums text-white/40">
      {now.toLocaleDateString("en-GB", { day: "2-digit", month: "short" })} ·{" "}
      {now.toLocaleTimeString("en-GB", { hour: "2-digit", minute: "2-digit" })}
    </span>
  );
}
