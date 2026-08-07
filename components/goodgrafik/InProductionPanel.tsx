import { Hammer } from "lucide-react";
import { ACCENT_CLASSES, type World } from "./worlds";

/**
 * The honest "not built yet" state for every Culture/News/Studio hub and
 * section page — per the brief: "For anything not implemented yet,
 * provide a polished 'In Production' state rather than fake
 * functionality." No placeholder data pretending to be real content;
 * just a clear status and what's planned for this section.
 */
export default function InProductionPanel({ world, title, description }: { world: World; title: string; description: string }) {
  const accent = ACCENT_CLASSES[world.accent];

  return (
    <div className="surface-panel mx-auto flex max-w-lg flex-col items-center gap-4 px-6 py-12 text-center">
      <span className={`flex h-12 w-12 items-center justify-center rounded-2xl border ${accent.border} ${accent.bgSoft} ${accent.text}`}>
        <Hammer size={20} />
      </span>
      <span className={`rounded-full ${accent.bgSoft} px-3 py-1 text-[10px] font-bold uppercase tracking-wide ${accent.text}`}>In Production</span>
      <h2 className="font-display text-xl font-bold text-white">{title}</h2>
      <p className="text-sm leading-6 text-white/45">{description}</p>
    </div>
  );
}
