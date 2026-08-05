/**
 * Converts a #rrggbb (or #rgb) hex color to a Tailwind-CSS-variable-
 * friendly "r g b" triplet string, e.g. "#f5a623" -> "245 166 35". This is
 * the format tailwind.config.ts's var(--ggsp-color-*-rgb) wiring expects,
 * so opacity modifiers (bg-brand-400/25) keep working on tokens driven by
 * the Brand Studio, exactly as they already do on the hardcoded palette.
 *
 * Falls back to "0 0 0" for anything that isn't parseable as hex —
 * callers should already be validating color inputs before storage; this
 * is a last-resort guard so one malformed value degrades to black rather
 * than breaking the whole CSS var block a page depends on.
 */
export function hexToRgbTriplet(hex: string): string {
  const normalized = hex.trim().replace(/^#/, "");
  const expanded = normalized.length === 3 ? normalized.split("").map((c) => c + c).join("") : normalized;
  if (!/^[0-9a-fA-F]{6}$/.test(expanded)) return "0 0 0";
  const r = parseInt(expanded.slice(0, 2), 16);
  const g = parseInt(expanded.slice(2, 4), 16);
  const b = parseInt(expanded.slice(4, 6), 16);
  return `${r} ${g} ${b}`;
}
