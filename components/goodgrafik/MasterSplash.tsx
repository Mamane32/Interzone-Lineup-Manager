"use client";

import Image from "next/image";
import { useEffect, useState } from "react";

const SESSION_KEY = "goodgrafik-splash-shown";
const HOLD_MS = 1200;
const FADE_MS = 400;

/**
 * One-time entry splash for the GoodGrafik master shell — the official
 * logo asset (public/brand/goodgrafik-logo.png, used exactly as supplied,
 * no redesign, no monogram) with a soft reveal + gold glow bloom, then a
 * fade to the real page underneath. Plays once per browser session
 * (sessionStorage), never blocks anything: the real page is already
 * rendering behind this fixed overlay the whole time (Next.js doesn't
 * wait for a client component to mount before streaming the page), the
 * overlay is `pointer-events-none` so it can never eat a click, and it
 * unmounts itself via a plain timeout rather than anything render-
 * blocking. Skipped outright — not just shortened — when the visitor
 * has prefers-reduced-motion or the platform owner has forced Reduced
 * Motion on (see ggsp-reduced-motion in app/globals.css): a splash whose
 * only content IS motion has nothing left to show once motion is off.
 */
export default function MasterSplash() {
  const [phase, setPhase] = useState<"hidden" | "visible" | "fading">("hidden");

  useEffect(() => {
    const reducedMotion =
      window.matchMedia("(prefers-reduced-motion: reduce)").matches || document.body.classList.contains("ggsp-reduced-motion");
    if (reducedMotion) return;
    if (sessionStorage.getItem(SESSION_KEY)) return;
    sessionStorage.setItem(SESSION_KEY, "1");

    setPhase("visible");
    const fadeTimer = setTimeout(() => setPhase("fading"), HOLD_MS);
    const removeTimer = setTimeout(() => setPhase("hidden"), HOLD_MS + FADE_MS);
    return () => {
      clearTimeout(fadeTimer);
      clearTimeout(removeTimer);
    };
  }, []);

  if (phase === "hidden") return null;

  return (
    <div
      className={`pointer-events-none fixed inset-0 z-[100] flex items-center justify-center bg-surface-950 ${phase === "fading" ? "animate-splash-fade-out" : ""}`}
      aria-hidden="true"
    >
      {/* Centered via inset-0 + m-auto, not left/top + translate — the glow's own
          keyframe animates `transform: scale(...)`, and a CSS animation's
          transform replaces the element's whole computed transform each frame
          rather than composing with a separate translate utility, which would
          silently cancel a translate-based centering trick once the animation
          finishes (animation-fill-mode: both keeps the last keyframe applied). */}
      <div className="animate-splash-glow pointer-events-none absolute inset-0 m-auto h-[28rem] w-[28rem] rounded-full bg-brand-400/20 blur-[100px]" />
      <div className="animate-splash-logo relative h-40 w-64 sm:h-52 sm:w-80">
        <Image src="/brand/goodgrafik-logo.png" alt="GoodGrafik" fill sizes="320px" priority className="object-contain" />
      </div>
    </div>
  );
}
