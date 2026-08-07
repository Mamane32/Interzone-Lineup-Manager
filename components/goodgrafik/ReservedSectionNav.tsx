import Link from "next/link";
import { ACCENT_CLASSES, type World } from "./worlds";

export type ReservedSection = { key: string; label: string; description: string };

/** The reserved information-architecture nav for a world hub (e.g. Culture's Artists/Bands/Events/Music/...) — every pill is a real route (app/(goodgrafik)/{world}/[section]) so the IA is locked in now even though each one renders an "In Production" state until its own sprint builds it. `activeKey` unset on the hub page itself; set on a section page so its own pill highlights. */
export default function ReservedSectionNav({ world, sections, activeKey }: { world: World; sections: ReservedSection[]; activeKey?: string }) {
  const accent = ACCENT_CLASSES[world.accent];

  return (
    <nav className="flex flex-wrap justify-center gap-2" aria-label={`Seksyon ${world.name}`}>
      <Link
        href={world.href}
        className={`rounded-full border px-3.5 py-1.5 text-xs font-semibold transition ${
          !activeKey ? `${accent.border} ${accent.bgSoft} ${accent.text}` : "border-white/10 text-white/50 hover:border-white/20 hover:text-white"
        }`}
      >
        Akèy
      </Link>
      {sections.map((section) => {
        const active = section.key === activeKey;
        return (
          <Link
            key={section.key}
            href={`${world.href}/${section.key}`}
            className={`rounded-full border px-3.5 py-1.5 text-xs font-semibold transition ${
              active ? `${accent.border} ${accent.bgSoft} ${accent.text}` : "border-white/10 text-white/50 hover:border-white/20 hover:text-white"
            }`}
          >
            {section.label}
          </Link>
        );
      })}
    </nav>
  );
}
