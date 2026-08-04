"use client";

import { useState } from "react";
import { Play, RotateCcw } from "lucide-react";
import PitchMarkings from "@/components/formation/PitchMarkings";
import type { PlacedPlayer } from "@/lib/formations";
import type { Theme } from "@/lib/team-theme";

type AnimationStyleKey = "slide" | "fade" | "scale" | "sequential" | "team-presentation" | "stadium-introduction";

/**
 * Six named styles, three real mechanics (slide / fade / scale) — "Team
 * Presentation" and "Stadium Introduction" are the same mechanics with a
 * grander, slower, more staggered choreography, not separate animation
 * systems. Runs entirely client-side; this is the choreography a future
 * broadcast graphics package would drive, not a live trigger — see the
 * note under the preview.
 */
const ANIMATION_STYLES: { key: AnimationStyleKey; label: string; mechanic: "slide" | "fade" | "scale"; staggerMs: number; durationMs: number }[] = [
  { key: "slide", label: "Slide In", mechanic: "slide", staggerMs: 55, durationMs: 600 },
  { key: "fade", label: "Fade In", mechanic: "fade", staggerMs: 50, durationMs: 550 },
  { key: "scale", label: "Scale In", mechanic: "scale", staggerMs: 45, durationMs: 480 },
  { key: "sequential", label: "Sequential Player Entrance", mechanic: "scale", staggerMs: 190, durationMs: 420 },
  { key: "team-presentation", label: "Team Presentation", mechanic: "slide", staggerMs: 150, durationMs: 800 },
  { key: "stadium-introduction", label: "Stadium Introduction", mechanic: "scale", staggerMs: 230, durationMs: 850 },
];

export default function FormationAnimationPreview({ positions, theme }: { positions: PlacedPlayer[]; theme: Theme }) {
  const [styleKey, setStyleKey] = useState<AnimationStyleKey>("slide");
  const [playKey, setPlayKey] = useState(0);
  const [playing, setPlaying] = useState(false);
  const style = ANIMATION_STYLES.find((s) => s.key === styleKey) ?? ANIMATION_STYLES[0];

  function play() {
    setPlaying(false);
    setPlayKey((k) => k + 1);
    requestAnimationFrame(() => requestAnimationFrame(() => setPlaying(true)));
  }

  return (
    <div className="flex flex-col gap-4">
      <div className="surface-panel flex flex-wrap items-center gap-3 p-3">
        <select
          value={styleKey}
          onChange={(e) => {
            setStyleKey(e.target.value as AnimationStyleKey);
            setPlaying(false);
          }}
          className="h-10 rounded-xl border border-white/[0.08] bg-white/[0.035] px-3 text-sm font-semibold text-white focus:border-brand-400/60 focus:outline-none [&>option]:bg-surface-900 [&>option]:text-white"
        >
          {ANIMATION_STYLES.map((s) => (
            <option key={s.key} value={s.key}>{s.label}</option>
          ))}
        </select>
        <button
          onClick={play}
          className="ml-auto inline-flex items-center gap-2 rounded-xl bg-gradient-to-b from-brand-100 to-brand-400 px-4 py-2 text-sm font-semibold text-surface-950 shadow-glow transition hover:-translate-y-0.5"
        >
          <Play size={15} /> Preview Animation
        </button>
        <button
          onClick={() => setPlaying(false)}
          className="inline-flex items-center gap-2 rounded-xl bg-white/5 px-3 py-2 text-sm font-medium text-white/60 hover:bg-white/10 hover:text-white"
        >
          <RotateCcw size={14} /> Reset
        </button>
      </div>

      <div key={playKey} className="surface-panel relative mx-auto aspect-[2/3] w-full max-w-md overflow-hidden p-0">
        <PitchMarkings />
        {positions.map((p, i) => {
          const isLeft = p.x < 50;
          const offPitchX = isLeft ? -18 : 118;
          const left = style.mechanic === "slide" ? (playing ? p.x : offPitchX) : p.x;
          const top = style.mechanic === "slide" ? (playing ? p.y : p.y) : p.y;
          const scale = style.mechanic === "scale" ? (playing ? 1 : 0.15) : 1;
          const opacity = style.mechanic === "slide" ? 1 : playing ? 1 : 0;

          return (
            <div
              key={p.playerId}
              className="absolute flex flex-col items-center gap-1"
              style={{
                left: `${left}%`,
                top: `${top}%`,
                opacity,
                transform: `translate(-50%, -50%) scale(${scale})`,
                transition: `left ${style.durationMs}ms cubic-bezier(0.16,1,0.3,1), top ${style.durationMs}ms cubic-bezier(0.16,1,0.3,1), transform ${style.durationMs}ms cubic-bezier(0.16,1,0.3,1), opacity ${style.durationMs}ms ease-out`,
                transitionDelay: `${i * style.staggerMs}ms`,
              }}
            >
              <div
                className={`flex h-9 w-9 items-center justify-center rounded-full border-2 font-display text-xs font-black shadow-lg ${
                  p.goalkeeper ? "border-emerald-300 bg-emerald-500 text-emerald-950" : `${theme.border} ${theme.solid} ${theme.solidText}`
                }`}
              >
                {p.shirtNumber}
              </div>
            </div>
          );
        })}
      </div>
      <p className="rounded-lg bg-white/[0.03] px-3 py-2 text-[10px] leading-5 text-white/30">
        Preview only, runs entirely in this browser — this is the choreography a future Starting XI broadcast graphic package would drive, not a live vMix trigger.
      </p>
    </div>
  );
}
