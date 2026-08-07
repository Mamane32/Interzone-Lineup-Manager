"use client";

import Image from "next/image";
import { useEffect, useState } from "react";

const SESSION_KEY = "goodgrafik-splash-shown";
const BODY_ACTIVE_CLASS = "ggsp-splash-active";
const HOLD_MS = 1850;
const FADE_MS = 780;

/**
 * One-time entry splash for the GoodGrafik master shell — the official
 * logo asset (public/brand/goodgrafik-logo.png, used exactly as supplied
 * — no redesign, no monogram), cropped to just the "GoodGrafik" wordmark
 * (the "PLATFORM / Sports · Culture · News · Studio" band baked into the
 * bottom of the source image is illegible at this display size, and the
 * brief allows dropping it) via object-position/aspect-ratio rather than
 * a second exported asset.
 *
 * Three staged beats, not one flat fade: the glow blooms, the logo does
 * a real spring-scale entrance (see .animate-splash-logo — starts at
 * 62%, overshoots past 100%, settles), then a gold underline sweeps in
 * beneath it. Plays once per browser session (sessionStorage), never
 * blocks anything: the real page is already rendering behind this fixed
 * overlay the whole time (Next.js doesn't wait for a client component to
 * mount before streaming the page), the overlay is `pointer-events-none`
 * so it can never eat a click, and it unmounts itself via a plain
 * timeout rather than anything render-blocking. Skipped outright — not
 * just shortened — when the visitor has prefers-reduced-motion or the
 * platform owner has forced Reduced Motion on (see ggsp-reduced-motion
 * in app/globals.css): a splash whose only content IS motion has nothing
 * left to show once motion is off.
 *
 * The overlay itself is translucent + heavily blurred (not opaque) —
 * the home page underneath is genuinely alive behind the mark the whole
 * time, not hidden until the mark is gone, matching the "premium opening
 * sequence" reference points (Apple/FIFA/PlayStation) rather than a
 * loading screen. In lockstep with `phase`, this also toggles a class on
 * `<body>` (BODY_ACTIVE_CLASS) that app/globals.css's `.goodgrafik-content`
 * rule reads: the home page content itself starts slightly blurred/scaled/
 * dimmed and pulls into sharp focus as the class is removed, exactly when
 * the overlay starts its own fade — the mark dissolves, the page comes
 * into focus, at the same moment, instead of a flat cut from "logo" to
 * "page." A repeat visit within the session (or reduced motion) never
 * adds the class at all, so the page renders at rest with zero animation.
 */
export default function MasterSplash() {
  const [phase, setPhase] = useState<"hidden" | "visible" | "fading">("hidden");

  useEffect(() => {
    const reducedMotion =
      window.matchMedia("(prefers-reduced-motion: reduce)").matches || document.body.classList.contains("ggsp-reduced-motion");
    if (reducedMotion) return;
    if (sessionStorage.getItem(SESSION_KEY)) return;
    sessionStorage.setItem(SESSION_KEY, "1");

    document.body.classList.add(BODY_ACTIVE_CLASS);
    setPhase("visible");
    const fadeTimer = setTimeout(() => {
      document.body.classList.remove(BODY_ACTIVE_CLASS);
      setPhase("fading");
    }, HOLD_MS);
    const removeTimer = setTimeout(() => setPhase("hidden"), HOLD_MS + FADE_MS);
    return () => {
      clearTimeout(fadeTimer);
      clearTimeout(removeTimer);
      document.body.classList.remove(BODY_ACTIVE_CLASS);
    };
  }, []);

  if (phase === "hidden") return null;

  return (
    <div
      className={`pointer-events-none fixed inset-0 z-[100] flex items-center justify-center bg-surface-950/[0.85] backdrop-blur-2xl ${phase === "fading" ? "animate-splash-fade-out" : ""}`}
      aria-hidden="true"
    >
      {/* Centered via inset-0 + m-auto, not left/top + translate — the glow's own
          keyframe animates `transform: scale(...)`, and a CSS animation's
          transform replaces the element's whole computed transform each frame
          rather than composing with a separate translate utility, which would
          silently cancel a translate-based centering trick once the animation
          finishes (animation-fill-mode: both keeps the last keyframe applied). */}
      <div className="animate-splash-glow pointer-events-none absolute inset-0 m-auto h-[28rem] w-[28rem] rounded-full bg-brand-400/20 blur-[100px]" />
      <div className={`flex flex-col items-center ${phase === "fading" ? "animate-splash-mark-out" : ""}`}>
        {/* Cropped to the wordmark only via object-top + cover on a short,
            wide box — the source PNG's lower band (PLATFORM / world names)
            never enters this box's rendered area, no second asset needed. */}
        <div className="animate-splash-logo relative aspect-[1536/240] w-72 sm:w-96">
          <Image src="/brand/goodgrafik-logo.png" alt="GoodGrafik" fill sizes="384px" priority className="object-cover object-[50%_33%]" />
        </div>
        <div className="animate-splash-underline mt-4 h-px w-28 bg-gradient-to-r from-transparent via-brand-400 to-transparent" />
      </div>
    </div>
  );
}
