"use client";

import { useMemo } from "react";
import { Gauge, MousePointerClick, Layers, Accessibility } from "lucide-react";
import { tokensByStudioSection, type ThemeToken } from "@/lib/theme-tokens";
import type { BrandDraft } from "./draft-utils";
import { TokenField } from "./ControlPanel";

const SPEED_PRESETS: { id: string; label: string; animationSpeed: number; reducedMotion: boolean }[] = [
  { id: "none", label: "None", animationSpeed: 1, reducedMotion: true },
  { id: "reduced", label: "Reduced", animationSpeed: 0.5, reducedMotion: false },
  { id: "normal", label: "Normal", animationSpeed: 1, reducedMotion: false },
  { id: "fast", label: "Fast", animationSpeed: 1.75, reducedMotion: false },
];

function noManageAsset() {
  // Motion has no image tokens — TokenField's onManageAsset is unreachable here, kept only to satisfy its shared prop shape.
}

function GroupHeader({ icon: Icon, title, description }: { icon: typeof Gauge; title: string; description: string }) {
  return (
    <div className="mb-3 flex items-start gap-2.5">
      <span className="mt-0.5 flex h-7 w-7 flex-none items-center justify-center rounded-lg bg-white/[0.05] text-white/40">
        <Icon size={14} />
      </span>
      <div>
        <p className="text-sm font-semibold text-white/85">{title}</p>
        <p className="text-[11px] leading-4 text-white/35">{description}</p>
      </div>
    </div>
  );
}

/**
 * "Motion" section body — replaces ControlPanel's generic field list the
 * same way ColorStudio/AssetGrid do for their sections. Groups the
 * registry's motion tokens into Speed / Interaction / Overlays / Loading /
 * Accessibility, each with a small inline live demo so an admin sees the
 * effect immediately without switching LivePreview tabs, plus every field
 * still available individually via TokenField (shared with ControlPanel,
 * so undo/redo/draft/reset/search all keep working unchanged — this
 * component only changes how fields are grouped and demoed, not how they're
 * read or written).
 */
export default function MotionStudio({
  draft,
  onChange,
  onBatchChange,
}: {
  draft: BrandDraft;
  onChange: (tokenId: string, value: string | number | boolean | null) => void;
  onBatchChange: (patch: Record<string, string | number | boolean | null>) => void;
}) {
  const tokenById = useMemo(() => {
    const map = new Map<string, ThemeToken>();
    for (const t of tokensByStudioSection("motion")) if (t.level === 1) map.set(t.id, t);
    return map;
  }, []);

  function field(id: string, className = "") {
    const token = tokenById.get(id);
    if (!token) return null;
    return (
      <div className={className}>
        <TokenField token={token} value={draft[id]} onChange={onChange} onManageAsset={noManageAsset} />
      </div>
    );
  }

  const activeSpeedPreset = SPEED_PRESETS.find(
    (p) => p.animationSpeed === draft.animationSpeed && p.reducedMotion === (draft.reducedMotion === true)
  );

  const hoverIntensity = typeof draft.hoverIntensity === "string" ? draft.hoverIntensity : "normal";
  const hoverEffectsOn = draft.hoverEffectsEnabled !== false;
  const cardHoverBehavior = typeof draft.cardHoverBehavior === "string" ? draft.cardHoverBehavior : "none";
  const focusRingAnimated = draft.focusRingAnimationEnabled === true;

  const demoHoverTransform =
    !hoverEffectsOn ? "" : hoverIntensity === "subtle" ? "hover:-translate-y-px" : hoverIntensity === "strong" ? "hover:-translate-y-1" : "hover:-translate-y-0.5";

  const demoCardHoverClass =
    cardHoverBehavior === "lift"
      ? "hover:-translate-y-1 hover:shadow-[0_20px_45px_-20px_rgba(0,0,0,0.6)]"
      : cardHoverBehavior === "glow"
        ? "hover:shadow-[0_0_0_1px_rgba(245,166,35,0.4)]"
        : cardHoverBehavior === "border"
          ? "hover:border-brand-400/50"
          : "";

  return (
    <div className="flex flex-col gap-6">
      {/* Speed — preset shortcuts plus the underlying slider. Each preset sets both animationSpeed and reducedMotion together in one undo step, since "None" really means "use the Reduced Motion mechanism," not merely a very small multiplier. */}
      <section className="rounded-xl border border-white/[0.07] bg-white/[0.015] p-4">
        <GroupHeader icon={Gauge} title="Animation Speed" description="A global multiplier for every timed animation, or force near-instant motion regardless of speed." />
        <div className="flex flex-wrap gap-1.5">
          {SPEED_PRESETS.map((preset) => (
            <button
              key={preset.id}
              type="button"
              onClick={() => onBatchChange({ animationSpeed: preset.animationSpeed, reducedMotion: preset.reducedMotion })}
              aria-pressed={activeSpeedPreset?.id === preset.id}
              className={`rounded-lg px-3 py-1.5 text-xs font-semibold transition ${
                activeSpeedPreset?.id === preset.id ? "bg-brand-400 text-surface-950" : "border border-white/[0.08] text-white/50 hover:text-white"
              }`}
            >
              {preset.label}
            </button>
          ))}
        </div>
        <div className="mt-3">{field("animationSpeed")}</div>
      </section>

      {/* Interaction — Hover Effects/Intensity and Button Press Feedback each get a real element you can hover/click right here. */}
      <section className="rounded-xl border border-white/[0.07] bg-white/[0.015] p-4">
        <GroupHeader icon={MousePointerClick} title="Interaction" description="Hover lift, press feedback, and card hover behavior." />
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
          {field("hoverEffectsEnabled")}
          {field("hoverIntensity")}
          {field("buttonPressFeedbackEnabled")}
          {field("cardHoverBehavior")}
        </div>
        <div className="mt-4 flex flex-wrap items-center gap-4 rounded-lg border border-white/[0.06] bg-black/15 p-3">
          <div className="flex flex-col items-center gap-1.5">
            <button
              type="button"
              className={`rounded-lg bg-gradient-to-b from-brand-100 to-brand-400 px-3 py-1.5 text-xs font-semibold text-surface-950 transition-all duration-200 active:scale-[0.97] ${demoHoverTransform} ${
                draft.buttonPressFeedbackEnabled === false ? "active:scale-100" : ""
              }`}
            >
              Hover / click me
            </button>
            <span className="text-[10px] text-white/30">Button</span>
          </div>
          <div className="flex flex-col items-center gap-1.5">
            <div className={`surface-panel px-4 py-2.5 text-xs text-white/70 transition-all duration-200 ${demoCardHoverClass}`}>Card</div>
            <span className="text-[10px] text-white/30">Card hover</span>
          </div>
        </div>
      </section>

      {/* Overlays — Modal/Drawer/Dropdown/Tooltip each have a real, verified target (see app/globals.css). Toast and Page Transition are Reserved — this app has no toast component or route-transition system yet, same honest labeling as Border Color. */}
      <section className="rounded-xl border border-white/[0.07] bg-white/[0.015] p-4">
        <GroupHeader icon={Layers} title="Overlays" description="Modals, drawers, dropdown menus, tooltips — plus two Reserved fields saved for later." />
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
          {field("modalAnimationEnabled")}
          {field("drawerAnimationEnabled")}
          {field("dropdownAnimationEnabled")}
          {field("tooltipAnimationEnabled")}
          {field("toastAnimationStyle")}
          {field("pageTransitionStyle")}
        </div>
      </section>

      {/* Loading — the same pulse LoadingState.tsx shows for both spinners and skeleton placeholders. */}
      <section className="rounded-xl border border-white/[0.07] bg-white/[0.015] p-4">
        <GroupHeader icon={Gauge} title="Loading" description="Spinners and skeleton placeholders." />
        {field("loadingAnimationEnabled")}
        <div className="mt-3 flex items-center gap-2 rounded-lg border border-white/[0.06] bg-black/15 p-3">
          <div className={`h-8 w-8 flex-none rounded-lg bg-white/[0.08] ${draft.loadingAnimationEnabled !== false ? "animate-pulse" : ""}`} />
          <div className="flex-1 space-y-1.5">
            <div className={`h-2.5 w-3/4 rounded bg-white/[0.08] ${draft.loadingAnimationEnabled !== false ? "animate-pulse" : ""}`} />
            <div className={`h-2.5 w-1/2 rounded bg-white/[0.06] ${draft.loadingAnimationEnabled !== false ? "animate-pulse" : ""}`} />
          </div>
        </div>
      </section>

      {/* Accessibility — Smooth Scroll, Reduced Motion (an explicit platform-wide override of prefers-reduced-motion), and Focus Ring Animation with a real focusable demo (Tab to it, or click). */}
      <section className="rounded-xl border border-white/[0.07] bg-white/[0.015] p-4">
        <GroupHeader icon={Accessibility} title="Accessibility" description="Smooth scrolling, forced reduced motion, and the keyboard-focus ring." />
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
          {field("smoothScrollEnabled")}
          {field("reducedMotion")}
          {field("focusRingAnimationEnabled")}
        </div>
        <div className="mt-3 flex items-center gap-3 rounded-lg border border-white/[0.06] bg-black/15 p-3">
          <button
            type="button"
            className={`rounded-lg border border-white/[0.1] px-3 py-1.5 text-xs text-white/60 ${focusRingAnimated ? "focus:animate-[ggsp-focus-pop_0.15s_ease-out]" : ""}`}
          >
            Tab or click to focus
          </button>
          <span className="text-[10px] text-white/30">Focus ring demo</span>
        </div>
      </section>

      {/* Reserved — predate this registry, no real target (the app has no theme-switching system, and Animation Level is superseded by the granular controls above). Kept visible and editable rather than hidden, same as every other Reserved field in the Studio. */}
      <section className="rounded-xl border border-white/[0.06] bg-white/[0.01] p-4">
        <p className="mb-3 text-[10px] font-semibold uppercase tracking-[.16em] text-white/25">Reserved</p>
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
          {field("lightModeEnabled")}
          {field("darkModeEnabled")}
          {field("defaultTheme")}
          {field("animationLevel")}
        </div>
      </section>
    </div>
  );
}
