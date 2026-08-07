import Link from "next/link";
import { ChevronRight } from "lucide-react";
import { ACCENT_CLASSES, type World } from "./worlds";
import type { ReservedSection } from "./ReservedSectionNav";

/** Editorial row-list presentation of News's reserved desks — deliberately plainer than ReservedSectionGrid (Culture/Studio): a numbered list, not cards, closer to a newspaper section index than a media-browsing grid. Keeps News visually distinct from Sports/Culture per the brief. */
export default function ReservedSectionList({ world, sections }: { world: World; sections: ReservedSection[] }) {
  const accent = ACCENT_CLASSES[world.accent];

  return (
    <div className="surface-panel divide-y divide-white/[0.06] overflow-hidden">
      {sections.map((section, i) => (
        <Link
          key={section.key}
          href={`${world.href}/${section.key}`}
          className="animate-fade-up group flex items-center gap-4 px-5 py-4 transition hover:bg-white/[0.03]"
          style={{ "--stagger": i } as React.CSSProperties}
        >
          <span className={`w-6 flex-none font-display text-sm font-bold ${accent.text}`}>{String(i + 1).padStart(2, "0")}</span>
          <div className="min-w-0 flex-1">
            <h3 className="font-display text-sm font-bold text-white">{section.label}</h3>
            <p className="mt-0.5 truncate text-xs text-white/40">{section.description}</p>
          </div>
          <ChevronRight size={15} className="flex-none text-white/20 transition group-hover:text-white/50" />
        </Link>
      ))}
    </div>
  );
}
