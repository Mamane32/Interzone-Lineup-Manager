import Link from "next/link";
import { ArrowUpRight, Radio } from "lucide-react";
import { ACCENT_CLASSES, type World } from "./worlds";

/**
 * One of the four world destination cards on the GoodGrafik master home.
 * Motion is restrained on purpose (per the brief): a staggered fade-up on
 * entry (`.animate-fade-up`, already gated by Brand Studio's Animation
 * Speed/Reduced Motion tokens — see app/globals.css), and on hover only a
 * subtle lift + icon drift + accent glow bloom, no spin/bounce/attention-
 * seeking loops.
 */
export default function WorldCard({ world, index }: { world: World; index: number }) {
  const accent = ACCENT_CLASSES[world.accent];
  const Icon = world.icon;

  return (
    <Link
      href={world.href}
      className="animate-fade-up surface-panel group relative flex min-h-52 flex-col justify-between overflow-hidden p-6 transition-transform duration-300 hover:-translate-y-1 sm:min-h-64 sm:p-8"
      style={{ "--stagger": index } as React.CSSProperties}
    >
      <div className={`pointer-events-none absolute -right-10 -top-10 h-40 w-40 rounded-full ${accent.glow} blur-3xl transition-opacity duration-300 group-hover:opacity-100 opacity-60`} />

      <div className="relative flex items-start justify-between">
        <span className={`flex h-12 w-12 flex-none items-center justify-center rounded-2xl border ${accent.border} ${accent.bgSoft} ${accent.text} transition-transform duration-300 group-hover:-translate-y-0.5 group-hover:scale-105`}>
          <Icon size={22} />
        </span>
        {world.live ? (
          <span className={`flex items-center gap-1.5 rounded-full ${accent.bgSoft} px-2.5 py-1 text-[10px] font-bold uppercase tracking-wide ${accent.text}`}>
            <Radio size={10} className="animate-pulse" /> Live
          </span>
        ) : (
          <span className="rounded-full bg-white/[0.06] px-2.5 py-1 text-[10px] font-semibold uppercase tracking-wide text-white/35">Coming soon</span>
        )}
      </div>

      <div className="relative">
        <h3 className="font-display text-3xl font-black tracking-tight text-white sm:text-4xl">{world.name}</h3>
        <p className="mt-2 max-w-xs text-sm leading-6 text-white/50">{world.tagline}</p>
        <span className={`mt-5 inline-flex items-center gap-1.5 text-xs font-bold uppercase tracking-wide ${accent.text} transition-transform duration-300 group-hover:translate-x-1`}>
          Enter {world.name} <ArrowUpRight size={14} />
        </span>
      </div>
    </Link>
  );
}
