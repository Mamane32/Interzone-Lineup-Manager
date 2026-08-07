import Link from "next/link";

export type CompetitionTab = "groups" | "bracket" | "archive";

const TABS: { key: CompetitionTab; label: string; href: string }[] = [
  { key: "groups", label: "Klasman", href: "/scores/competition?view=groups" },
  { key: "bracket", label: "Bracket", href: "/scores/competition?view=bracket" },
  { key: "archive", label: "Achiv", href: "/scores/archive" },
];

/** Shared segmented tab strip across everything under the "Konpetisyon" umbrella — /scores/competition's Klasman/Bracket views and /scores/archive's past editions — extracted so the three tabs stay in sync with one destination each instead of app/scores/competition/page.tsx and app/scores/archive/page.tsx drifting apart. */
export default function CompetitionTabs({ active }: { active: CompetitionTab }) {
  return (
    <div className="flex gap-1 rounded-xl border border-white/[0.08] bg-white/[0.03] p-1">
      {TABS.map((tab) => (
        <Link
          key={tab.key}
          href={tab.href}
          className={`flex-1 rounded-lg py-2 text-center font-display text-xs font-bold uppercase tracking-wide transition ${
            active === tab.key ? "bg-brand-400 text-surface-950" : "text-white/45 hover:text-white/80"
          }`}
        >
          {tab.label}
        </Link>
      ))}
    </div>
  );
}
