import Link from "next/link";
import { ArrowUpRight } from "lucide-react";
import { ACCENT_CLASSES, type World } from "./worlds";
import type { ReservedSection } from "./ReservedSectionNav";

/** Card-grid presentation of a world's reserved sections — used by Culture and Studio, both content-rich, visually "browse a world" worlds. News uses ReservedSectionList instead, a plainer row layout in line with an editorial look. */
export default function ReservedSectionGrid({ world, sections }: { world: World; sections: ReservedSection[] }) {
  const accent = ACCENT_CLASSES[world.accent];

  return (
    <div className="grid gap-3 sm:grid-cols-2">
      {sections.map((section, i) => (
        <Link
          key={section.key}
          href={`${world.href}/${section.key}`}
          className="animate-fade-up surface-panel group flex flex-col gap-2 p-5 transition hover:border-white/20"
          style={{ "--stagger": i } as React.CSSProperties}
        >
          <div className="flex items-center justify-between">
            <h3 className="font-display text-base font-bold text-white">{section.label}</h3>
            <ArrowUpRight size={15} className={`${accent.text} transition-transform group-hover:translate-x-0.5 group-hover:-translate-y-0.5`} />
          </div>
          <p className="text-xs leading-5 text-white/40">{section.description}</p>
        </Link>
      ))}
    </div>
  );
}
