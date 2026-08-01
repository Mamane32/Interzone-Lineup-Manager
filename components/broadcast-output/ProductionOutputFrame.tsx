"use client";

import { useEffect, useState } from "react";
import type { ProductionQueueItem } from "@/lib/broadcast/ProductionQueueEngine";

const POLL_MS = 4000;

/**
 * The actual Program (PGM) / Preview (PVW) output surface — full-bleed,
 * no operator chrome, meant to be captured by a vision mixer or shown
 * directly on a venue screen, not clicked through. Deliberately not a
 * full graphics compositor: it shows WHICH production_queue item is
 * live (Program) or next up (Preview) as a clean slate, not a rendered
 * scoreboard/lower-third template — those per-graphic-type templates
 * don't exist yet (see SPRINT_2_PHASE_4_PREVIEW_PROGRAM_PROPOSAL.md,
 * Decision 2). The score/team names are a real, always-on bug underneath.
 *
 * Polls app/api/live/[matchId]/production-queue/route.ts every few
 * seconds rather than subscribing to Supabase Realtime directly — this
 * project has no RLS policies anywhere (service-role-only access
 * everywhere), and giving the browser a direct Realtime subscription
 * would need the first one. Polling reuses the same service-role-backed
 * API route pattern already established for /api/live/[matchId]. Any
 * device on the network can open this page's URL and get updates within
 * one poll interval — single monitor, dual monitor (pop this window out
 * to a second screen), external display, or a future production room are
 * all just "open this URL," no pairing step.
 */
export default function ProductionOutputFrame({
  matchId,
  mode,
  initialItems,
  homeTeamName,
  awayTeamName,
  homeScore,
  awayScore,
}: {
  matchId: string;
  mode: "program" | "preview";
  initialItems: ProductionQueueItem[];
  homeTeamName: string;
  awayTeamName: string;
  homeScore: number;
  awayScore: number;
}) {
  const [items, setItems] = useState(initialItems);

  useEffect(() => {
    let cancelled = false;

    async function tick() {
      try {
        const res = await fetch(`/api/live/${matchId}/production-queue`, { cache: "no-store" });
        if (!res.ok) return;
        const data = await res.json();
        if (!cancelled) setItems(data.items ?? []);
      } catch {
        // Transient network errors are expected on an unattended output display — just retry next tick.
      }
    }

    const interval = setInterval(tick, POLL_MS);
    return () => {
      cancelled = true;
      clearInterval(interval);
    };
  }, [matchId]);

  const liveItem = items.find((i) => i.status === "live") ?? null;
  const nextItem = items.filter((i) => i.status === "queued").sort((a, b) => a.queueOrder - b.queueOrder)[0] ?? null;
  const featured = mode === "program" ? liveItem : nextItem;

  return (
    <div className="flex min-h-screen flex-col justify-between bg-black p-10 text-white">
      <div className="flex items-center justify-between">
        <span
          className={`rounded-full px-4 py-1.5 text-sm font-bold uppercase tracking-[0.25em] ${
            mode === "program" ? "bg-red-500 text-white" : "bg-amber-signal text-ink"
          }`}
        >
          {mode === "program" ? "Program" : "Preview"}
        </span>
        {mode === "program" && liveItem && (
          <span className="flex items-center gap-2 text-sm font-bold uppercase tracking-widest text-red-400">
            <span className="relative flex h-2.5 w-2.5">
              <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-red-500 opacity-75" />
              <span className="relative inline-flex h-2.5 w-2.5 rounded-full bg-red-500" />
            </span>
            On Air
          </span>
        )}
      </div>

      <div className="flex flex-col items-center gap-4 text-center">
        {featured ? (
          <>
            <p className="text-sm font-semibold uppercase tracking-[0.35em] text-white/40">{featured.category}</p>
            <p className="font-display text-7xl font-black">{featured.name}</p>
          </>
        ) : (
          <p className="font-display text-3xl font-semibold text-white/25">{mode === "program" ? "Nothing live" : "Queue empty"}</p>
        )}
      </div>

      <div className="flex items-center justify-center gap-10 font-display text-4xl font-bold">
        <span className="max-w-xs truncate">{homeTeamName}</span>
        <span className="tabular-nums text-white/90">
          {homeScore} – {awayScore}
        </span>
        <span className="max-w-xs truncate">{awayTeamName}</span>
      </div>
    </div>
  );
}
