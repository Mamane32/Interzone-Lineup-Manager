import Link from "next/link";
import { Radio } from "lucide-react";
import { ACCENT_CLASSES, type World } from "./worlds";

/**
 * One of the four world destination cards on the GoodGrafik master home —
 * styled to match the approved reference mockups: a colored ambient wash
 * per world, a large icon mark, and a rounded, outlined "Antre" pill
 * button in the world's accent (filling solid on hover) rather than a
 * plain text link. No photography — this project has no real photo
 * assets for Sports/Culture/Studio/News to source honestly, so the
 * identity comes from color, icon and motion instead of stock imagery.
 * Motion stays restrained per the brief: a staggered fade-up on entry
 * (`.animate-fade-up`, gated by Brand Studio's Animation Speed/Reduced
 * Motion tokens) and a subtle lift + glow bloom on hover.
 */
export default function WorldCard({ world, index }: { world: World; index: number }) {
  const accent = ACCENT_CLASSES[world.accent];
  const Icon = world.icon;

  return (
    <Link
      href={world.href}
      className="animate-fade-up surface-panel group relative flex min-h-64 flex-col justify-between overflow-hidden p-6 transition-transform duration-300 hover:-translate-y-1 sm:min-h-72 sm:p-8"
      style={{ "--stagger": index } as React.CSSProperties}
    >
      <div className={`pointer-events-none absolute inset-x-0 top-0 h-2/3 ${accent.glow} opacity-40 blur-3xl transition-opacity duration-300 group-hover:opacity-70`} />

      <div className="relative flex items-start justify-between">
        <span className={`flex h-14 w-14 flex-none items-center justify-center rounded-2xl border ${accent.border} ${accent.bgSoft} ${accent.text} transition-transform duration-300 group-hover:-translate-y-0.5 group-hover:scale-105`}>
          <Icon size={26} />
        </span>
        {world.live ? (
          <span className={`flex items-center gap-1.5 rounded-full ${accent.bgSoft} px-2.5 py-1 text-[10px] font-bold uppercase tracking-wide ${accent.text}`}>
            <Radio size={10} className="animate-pulse" /> Live
          </span>
        ) : (
          <span className="rounded-full bg-white/[0.06] px-2.5 py-1 text-[10px] font-semibold uppercase tracking-wide text-white/35">Byento</span>
        )}
      </div>

      <div className="relative">
        <h3 className="font-display text-3xl font-black uppercase tracking-tight text-white sm:text-4xl">GG {world.name}</h3>
        <p className="mt-2 max-w-xs text-sm leading-6 text-white/50">{world.tagline}</p>
        <span
          className={`mt-6 inline-flex h-10 items-center gap-2 rounded-full border ${accent.border} px-6 text-xs font-bold uppercase tracking-wide ${accent.text} transition-colors duration-200 ${accent.hoverBg} group-hover:text-surface-950`}
        >
          Antre
        </span>
      </div>
    </Link>
  );
}
