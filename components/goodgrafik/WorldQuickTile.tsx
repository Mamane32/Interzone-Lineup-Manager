import Link from "next/link";
import { ACCENT_CLASSES, type World } from "./worlds";

/**
 * The hero's quick-access icon tile for one world — solid colored square
 * + icon + label, per the reference mockup. Deliberately smaller/simpler
 * than WorldCard: these two live at different altitudes on the same page
 * (per the brief) — this is fast access from the very top of the page,
 * WorldCard further down is the immersive "discover this world" card.
 * Neither replaces the other.
 */
export default function WorldQuickTile({ world, index }: { world: World; index: number }) {
  const accent = ACCENT_CLASSES[world.accent];
  const Icon = world.icon;

  return (
    <Link
      href={world.href}
      className="animate-fade-up group flex flex-col items-center gap-2"
      style={{ "--stagger": index } as React.CSSProperties}
    >
      <span
        className={`flex h-16 w-16 items-center justify-center rounded-2xl ${accent.bg} text-surface-950 shadow-lg transition-transform duration-200 group-hover:-translate-y-1 group-hover:scale-105 sm:h-[4.5rem] sm:w-[4.5rem]`}
      >
        <Icon size={28} />
      </span>
      <span className="text-xs font-semibold text-white/70">{world.name}</span>
    </Link>
  );
}
