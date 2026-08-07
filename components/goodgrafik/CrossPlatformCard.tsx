import Link from "next/link";
import { Radio } from "lucide-react";
import { ACCENT_CLASSES, WORLDS } from "./worlds";
import type { CrossPlatformItem } from "./cross-platform";

/** One card in the master home's This Week / Trending Now rails. The world badge (top-left) is what makes a cross-platform rail legible — every card must announce which world it belongs to before anything else, per the brief. Demo items (Culture/News/Studio today) carry a visible "Demo preview" tag instead of pretending to be real content. */
export default function CrossPlatformCard({ item, index }: { item: CrossPlatformItem; index: number }) {
  const world = WORLDS.find((w) => w.id === item.world)!;
  const accent = ACCENT_CLASSES[world.accent];
  const Icon = world.icon;

  return (
    <Link
      href={item.href}
      className="animate-fade-up surface-panel group flex w-64 flex-none flex-col gap-3 p-4 transition hover:border-white/20 sm:w-72"
      style={{ "--stagger": index } as React.CSSProperties}
    >
      <div className="flex items-center justify-between">
        <span className={`flex items-center gap-1.5 rounded-full ${accent.bgSoft} px-2.5 py-1 text-[10px] font-bold uppercase tracking-wide ${accent.text}`}>
          <Icon size={11} /> {world.name}
        </span>
        {item.isLive ? (
          <span className="flex items-center gap-1 rounded-full bg-red-500 px-2 py-0.5 text-[9px] font-bold uppercase tracking-wide text-white">
            <Radio size={9} className="animate-pulse" /> Live
          </span>
        ) : item.isDemo ? (
          <span className="rounded-full bg-white/[0.06] px-2 py-0.5 text-[9px] font-semibold uppercase tracking-wide text-white/35">Apèsi Demo</span>
        ) : null}
      </div>

      <div className="flex-1">
        <p className="font-display text-base font-bold leading-snug text-white">{item.title}</p>
        <p className="mt-1 text-xs text-white/40">{item.subtitle}</p>
      </div>

      <p className="text-[11px] font-semibold uppercase tracking-wide text-white/30">{item.meta}</p>
    </Link>
  );
}
