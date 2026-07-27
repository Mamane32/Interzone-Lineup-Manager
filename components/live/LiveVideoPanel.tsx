"use client";

import { useRef, useState } from "react";
import { Radio, Signal, Maximize, Volume2, Activity } from "lucide-react";
import SectionHeader from "./SectionHeader";

const LIVE_STATUSES = new Set(["kickoff", "first_half", "second_half", "extra_time", "penalty_shootout"]);

/**
 * Video Monitoring Placeholder — Program (what's on air) and Preview (what's
 * queued next) monitors, the standard layout in a real broadcast control
 * room. Per the brief: "Do NOT implement actual live streaming... Do not
 * claim the stream is operational." Every reading here (resolution,
 * bitrate, audio) is a static placeholder, clearly labeled. Fullscreen is
 * wired to the real browser Fullscreen API since it costs nothing and
 * doesn't involve any video; nothing else here is functional.
 */
export default function LiveVideoPanel({ status }: { status: string }) {
  const isLive = LIVE_STATUSES.has(status);

  return (
    <div className="rounded-2xl border border-white/10 bg-white/[0.03] p-4">
      <SectionHeader
        title="Video Monitoring"
        badge={<span className="rounded-full bg-white/5 px-2 py-0.5 text-[10px] text-white/30">Live video integration coming later</span>}
      />
      <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
        <Monitor label="Program" isLive={isLive} allowFullscreen />
        <Monitor label="Preview" isLive={false} />
      </div>
    </div>
  );
}

function Monitor({ label, isLive, allowFullscreen = false }: { label: string; isLive: boolean; allowFullscreen?: boolean }) {
  const containerRef = useRef<HTMLDivElement>(null);

  function toggleFullscreen() {
    if (!containerRef.current) return;
    if (!document.fullscreenElement) {
      containerRef.current.requestFullscreen?.();
    } else {
      document.exitFullscreen?.();
    }
  }

  return (
    <div>
      <div
        ref={containerRef}
        className={`relative flex aspect-video flex-col justify-between overflow-hidden rounded-xl border bg-black ${
          isLive ? "border-red-500/40" : "border-white/10"
        }`}
      >
        <div className="absolute inset-0 flex items-center justify-center bg-gradient-to-br from-white/[0.03] to-transparent">
          <div className="flex flex-col items-center gap-1.5 text-center">
            <Radio size={22} className="text-white/12" />
            <p className="text-[10px] font-medium text-white/25">No source connected</p>
          </div>
        </div>

        <div className="relative z-10 flex items-center justify-between p-2">
          {isLive ? (
            <span className="flex items-center gap-1 rounded-full bg-red-500 px-2 py-0.5 text-[9px] font-bold uppercase tracking-wide text-white">
              <span className="h-1.5 w-1.5 animate-pulse rounded-full bg-white" /> {label}
            </span>
          ) : (
            <span className="rounded-full bg-white/10 px-2 py-0.5 text-[9px] font-bold uppercase tracking-wide text-white/40">
              {label}
            </span>
          )}
          {allowFullscreen && (
            <button
              onClick={toggleFullscreen}
              className="flex h-6 w-6 items-center justify-center rounded-md bg-black/50 text-white/60 hover:bg-black/70 hover:text-white"
            >
              <Maximize size={11} />
            </button>
          )}
        </div>
      </div>

      <div className="mt-1.5 flex items-center justify-between text-[9px] text-white/30">
        <span className="flex items-center gap-1">
          <Signal size={10} /> —
        </span>
        <span className="flex items-center gap-1">
          <Activity size={10} /> — kbps
        </span>
        <span className="flex items-center gap-1">
          <Volume2 size={10} /> —
        </span>
      </div>
    </div>
  );
}
