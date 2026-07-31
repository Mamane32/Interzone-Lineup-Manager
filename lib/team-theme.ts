/**
 * Dynamic team/competition branding without a schema change.
 *
 * There's no `color` or `banner_url` column on teams or competitions, and
 * this sprint is UI-only (per the Sprint 1 review: "no architecture changes
 * required"). Instead, each team/competition gets a deterministic accent
 * theme derived from its existing `id` — same team always renders in the
 * same colors, no admin action needed, works for every team automatically.
 *
 * The class strings below are written out in full (not built from template
 * literals) so Tailwind's compiler can find and include them at build time.
 */
export type Theme = {
  /** Hero/banner gradient background */
  heroFrom: string;
  heroTo: string;
  /** Ring/border accent around logos, badges */
  ring: string;
  /** Same accent as `ring`, as a `border-*` class — kept as its own literal
   * string (not derived from `ring` via string manipulation) because
   * Tailwind's compiler only picks up class names that appear verbatim in
   * source, not ones built at runtime. */
  border: string;
  /** Soft chip background for small tags */
  chipBg: string;
  chipText: string;
  /** Solid accent, e.g. active nav state, progress bars */
  solid: string;
  solidText: string;
};

const THEMES: Theme[] = [
  {
    heroFrom: "from-emerald-600",
    heroTo: "to-emerald-950",
    ring: "ring-emerald-400/40",
    border: "border-emerald-400/40",
    chipBg: "bg-emerald-500/15",
    chipText: "text-emerald-300",
    solid: "bg-emerald-500",
    solidText: "text-emerald-950",
  },
  {
    heroFrom: "from-blue-600",
    heroTo: "to-blue-950",
    ring: "ring-blue-400/40",
    border: "border-blue-400/40",
    chipBg: "bg-blue-500/15",
    chipText: "text-blue-300",
    solid: "bg-blue-500",
    solidText: "text-blue-950",
  },
  {
    heroFrom: "from-rose-600",
    heroTo: "to-rose-950",
    ring: "ring-rose-400/40",
    border: "border-rose-400/40",
    chipBg: "bg-rose-500/15",
    chipText: "text-rose-300",
    solid: "bg-rose-500",
    solidText: "text-rose-950",
  },
  {
    heroFrom: "from-violet-600",
    heroTo: "to-violet-950",
    ring: "ring-violet-400/40",
    border: "border-violet-400/40",
    chipBg: "bg-violet-500/15",
    chipText: "text-violet-300",
    solid: "bg-violet-500",
    solidText: "text-violet-950",
  },
  {
    heroFrom: "from-amber-500",
    heroTo: "to-amber-900",
    ring: "ring-amber-300/40",
    border: "border-amber-300/40",
    chipBg: "bg-amber-400/15",
    chipText: "text-amber-300",
    solid: "bg-amber-400",
    solidText: "text-amber-950",
  },
  {
    heroFrom: "from-teal-600",
    heroTo: "to-teal-950",
    ring: "ring-teal-400/40",
    border: "border-teal-400/40",
    chipBg: "bg-teal-500/15",
    chipText: "text-teal-300",
    solid: "bg-teal-500",
    solidText: "text-teal-950",
  },
  {
    heroFrom: "from-orange-600",
    heroTo: "to-orange-950",
    ring: "ring-orange-400/40",
    border: "border-orange-400/40",
    chipBg: "bg-orange-500/15",
    chipText: "text-orange-300",
    solid: "bg-orange-500",
    solidText: "text-orange-950",
  },
  {
    heroFrom: "from-indigo-600",
    heroTo: "to-indigo-950",
    ring: "ring-indigo-400/40",
    border: "border-indigo-400/40",
    chipBg: "bg-indigo-500/15",
    chipText: "text-indigo-300",
    solid: "bg-indigo-500",
    solidText: "text-indigo-950",
  },
];

/** Stable string hash — same input always produces the same theme index. */
function hash(seed: string): number {
  let h = 0;
  for (let i = 0; i < seed.length; i++) {
    h = (h * 31 + seed.charCodeAt(i)) >>> 0;
  }
  return h;
}

export function getTheme(seed: string | null | undefined): Theme {
  if (!seed) return THEMES[0];
  return THEMES[hash(seed) % THEMES.length];
}
