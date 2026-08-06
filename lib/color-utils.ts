/**
 * Color math shared by both the server (lib/branding.ts, which starts
 * with `import "server-only"`) and the client (components/brand-studio/**,
 * via draft-utils.ts). This file itself has no "server-only" import and
 * must never gain one — see AuthFrame/AuthFrameView's doc comments
 * (Sprint 3) for what happens to the production build the moment a
 * client component transitively imports a file that does.
 *
 * Color Studio (Sprint 3, Phase 1) additions: full hex/rgb/hsl
 * conversion, an 8-digit-hex-with-alpha convention (`#RRGGBBAA` — valid
 * CSS since Color Module Level 4, so a raw token var can carry
 * translucency without any extra "-a" sibling variable), and a
 * Tailwind-style 50–900 scale generator so "Primary 50–900" / "Secondary
 * 50–900" are computed live from one stored base color instead of
 * requiring ten hand-picked, individually-stored swatches per palette.
 */

export type RGBA = { r: number; g: number; b: number; a: number };
export type HSLA = { h: number; s: number; l: number; a: number };

/** True if `value` is a syntactically valid `#rrggbb` or `#rrggbbaa` color — the one format every "color" Brand Studio token accepts for storage. Kept here (rather than only in draft-utils.ts/actions.ts) so every layer validates the exact same rule. */
export function isValidColorHex(value: unknown): value is string {
  return typeof value === "string" && /^#[0-9a-fA-F]{6}([0-9a-fA-F]{2})?$/.test(value);
}

function clampByte(n: number): number {
  return Math.max(0, Math.min(255, Math.round(n)));
}

/** Parses `#rgb`, `#rrggbb`, or `#rrggbbaa` into 0–255 channels plus 0–1 alpha. Returns null (not a black fallback) for anything unparseable — callers that need a last-resort color should decide that themselves, since "silently render black" is the wrong choice inside an interactive picker. */
export function hexToRgb(hex: string): RGBA | null {
  const normalized = hex.trim().replace(/^#/, "");
  let expanded = normalized;
  if (normalized.length === 3) expanded = normalized.split("").map((c) => c + c).join("");
  if (!/^[0-9a-fA-F]{6}([0-9a-fA-F]{2})?$/.test(expanded)) return null;
  const r = parseInt(expanded.slice(0, 2), 16);
  const g = parseInt(expanded.slice(2, 4), 16);
  const b = parseInt(expanded.slice(4, 6), 16);
  const a = expanded.length === 8 ? parseInt(expanded.slice(6, 8), 16) / 255 : 1;
  return { r, g, b, a };
}

/** Inverse of hexToRgb — emits `#rrggbb` when fully opaque (matching every pre-Color-Studio stored value, so nothing already saved needs migrating) and `#rrggbbaa` only when alpha is meaningfully less than 1. */
export function rgbToHex({ r, g, b, a = 1 }: { r: number; g: number; b: number; a?: number }): string {
  const toHex = (n: number) => clampByte(n).toString(16).padStart(2, "0");
  const base = `#${toHex(r)}${toHex(g)}${toHex(b)}`;
  if (a >= 1) return base;
  const alphaHex = clampByte(a * 255).toString(16).padStart(2, "0");
  return `${base}${alphaHex}`;
}

/** Converts a #rrggbb (or #rgb) hex color to a Tailwind-CSS-variable-friendly "r g b" triplet string, e.g. "#f5a623" -> "245 166 35". This is the format tailwind.config.ts's var(--ggsp-color-*-rgb) wiring expects, so opacity modifiers (bg-brand-400/25) keep working on tokens driven by the Brand Studio. An 8-digit hex's alpha byte is ignored here on purpose — the plain CSS var (not this "-rgb" sibling) already carries alpha natively via #rrggbbaa, so this triplet stays a pure 0–1-alpha-free RGB value for Tailwind's own opacity-modifier math. Falls back to "0 0 0" for anything unparseable. */
export function hexToRgbTriplet(hex: string): string {
  const rgb = hexToRgb(hex);
  if (!rgb) return "0 0 0";
  return `${clampByte(rgb.r)} ${clampByte(rgb.g)} ${clampByte(rgb.b)}`;
}

export function rgbToHsl(r: number, g: number, b: number): { h: number; s: number; l: number } {
  const rn = r / 255, gn = g / 255, bn = b / 255;
  const max = Math.max(rn, gn, bn), min = Math.min(rn, gn, bn);
  const l = (max + min) / 2;
  if (max === min) return { h: 0, s: 0, l: l * 100 };
  const d = max - min;
  const s = l > 0.5 ? d / (2 - max - min) : d / (max + min);
  let h: number;
  switch (max) {
    case rn:
      h = ((gn - bn) / d + (gn < bn ? 6 : 0)) * 60;
      break;
    case gn:
      h = ((bn - rn) / d + 2) * 60;
      break;
    default:
      h = ((rn - gn) / d + 4) * 60;
  }
  return { h, s: s * 100, l: l * 100 };
}

export function hslToRgb(h: number, s: number, l: number): { r: number; g: number; b: number } {
  const hn = (((h % 360) + 360) % 360) / 360;
  const sn = Math.max(0, Math.min(100, s)) / 100;
  const ln = Math.max(0, Math.min(100, l)) / 100;
  if (sn === 0) {
    const v = clampByte(ln * 255);
    return { r: v, g: v, b: v };
  }
  const q = ln < 0.5 ? ln * (1 + sn) : ln + sn - ln * sn;
  const p = 2 * ln - q;
  const hue2rgb = (t: number) => {
    let tt = t;
    if (tt < 0) tt += 1;
    if (tt > 1) tt -= 1;
    if (tt < 1 / 6) return p + (q - p) * 6 * tt;
    if (tt < 1 / 2) return q;
    if (tt < 2 / 3) return p + (q - p) * (2 / 3 - tt) * 6;
    return p;
  };
  return {
    r: clampByte(hue2rgb(hn + 1 / 3) * 255),
    g: clampByte(hue2rgb(hn) * 255),
    b: clampByte(hue2rgb(hn - 1 / 3) * 255),
  };
}

export type HSVA = { h: number; s: number; v: number; a: number };

/**
 * HSV/HSB — used only by ColorPicker.tsx's 2D saturation/value square and
 * hue slider, because a saturation-vs-value square (pure hue in one
 * corner, white in the adjacent corner, black along the bottom) is the
 * industry-standard picker layout and reads correctly at a glance, unlike
 * a saturation-vs-lightness square in HSL space, where the top edge is
 * never pure white. The numeric H/S/L inputs elsewhere in the picker
 * still use true HSL (rgbToHsl/hslToRgb above) — both are derived from
 * the same underlying RGB, so they never disagree with each other.
 */
export function rgbToHsv(r: number, g: number, b: number): { h: number; s: number; v: number } {
  const rn = r / 255, gn = g / 255, bn = b / 255;
  const max = Math.max(rn, gn, bn), min = Math.min(rn, gn, bn);
  const d = max - min;
  const v = max;
  const s = max === 0 ? 0 : d / max;
  let h: number;
  if (d === 0) {
    h = 0;
  } else {
    switch (max) {
      case rn:
        h = ((gn - bn) / d + (gn < bn ? 6 : 0)) * 60;
        break;
      case gn:
        h = ((bn - rn) / d + 2) * 60;
        break;
      default:
        h = ((rn - gn) / d + 4) * 60;
    }
  }
  return { h, s: s * 100, v: v * 100 };
}

export function hsvToRgb(h: number, s: number, v: number): { r: number; g: number; b: number } {
  const hn = (((h % 360) + 360) % 360) / 60;
  const sn = Math.max(0, Math.min(100, s)) / 100;
  const vn = Math.max(0, Math.min(100, v)) / 100;
  const c = vn * sn;
  const x = c * (1 - Math.abs((hn % 2) - 1));
  const m = vn - c;
  let rp = 0, gp = 0, bp = 0;
  if (hn < 1) [rp, gp, bp] = [c, x, 0];
  else if (hn < 2) [rp, gp, bp] = [x, c, 0];
  else if (hn < 3) [rp, gp, bp] = [0, c, x];
  else if (hn < 4) [rp, gp, bp] = [0, x, c];
  else if (hn < 5) [rp, gp, bp] = [x, 0, c];
  else [rp, gp, bp] = [c, 0, x];
  return { r: clampByte((rp + m) * 255), g: clampByte((gp + m) * 255), b: clampByte((bp + m) * 255) };
}

export function hexToHsv(hex: string): HSVA | null {
  const rgb = hexToRgb(hex);
  if (!rgb) return null;
  const { h, s, v } = rgbToHsv(rgb.r, rgb.g, rgb.b);
  return { h, s, v, a: rgb.a };
}

export function hsvToHex(h: number, s: number, v: number, a = 1): string {
  const { r, g, b } = hsvToRgb(h, s, v);
  return rgbToHex({ r, g, b, a });
}

export function hexToHsl(hex: string): HSLA | null {
  const rgb = hexToRgb(hex);
  if (!rgb) return null;
  const { h, s, l } = rgbToHsl(rgb.r, rgb.g, rgb.b);
  return { h, s, l, a: rgb.a };
}

export function hslToHex(h: number, s: number, l: number, a = 1): string {
  const { r, g, b } = hslToRgb(h, s, l);
  return rgbToHex({ r, g, b, a });
}

/**
 * Tailwind-style 50–900 scale steps. Deliberately not stored per-stop in
 * the database — the Color Studio computes all ten from the single saved
 * base color (the existing `primaryColor`/`secondaryColor` tokens) so the
 * whole ramp updates live the instant the base color changes, the same
 * way Tailwind/Radix generate their own default palettes from a seed
 * color rather than shipping ten hand-authored hex values per hue.
 */
export const COLOR_SCALE_STEPS = ["50", "100", "200", "300", "400", "500", "600", "700", "800", "900"] as const;
export type ColorScaleStep = (typeof COLOR_SCALE_STEPS)[number];

/** Target lightness (0–1) for each stop — tuned to land a mid-saturation base color close to its "500" stop while still producing a legible near-white 50 and near-black 900, matching the shape (not the exact values) of Tailwind's default scales. */
const SCALE_LIGHTNESS: Record<ColorScaleStep, number> = {
  "50": 0.97,
  "100": 0.93,
  "200": 0.85,
  "300": 0.74,
  "400": 0.62,
  "500": 0.5,
  "600": 0.42,
  "700": 0.34,
  "800": 0.26,
  "900": 0.16,
};

/** Generates a full 50–900 scale from one base hex color by holding hue fixed and varying lightness (with saturation tapered slightly near the light/dark extremes, so 50 and 900 don't wash out to grey the way naive pure-lightness interpolation does). Returns the base's own hex unchanged if it isn't parseable, repeated across every stop, so a caller never has to null-check the result mid-render. */
export function generateColorScale(baseHex: string): Record<ColorScaleStep, string> {
  const hsl = hexToHsl(baseHex);
  if (!hsl) {
    const fallback = {} as Record<ColorScaleStep, string>;
    for (const step of COLOR_SCALE_STEPS) fallback[step] = baseHex;
    return fallback;
  }
  const scale = {} as Record<ColorScaleStep, string>;
  for (const step of COLOR_SCALE_STEPS) {
    const targetL = SCALE_LIGHTNESS[step] * 100;
    // Taper saturation as lightness moves toward either extreme (0 or
    // 100), proportional to distance from the mid-scale — keeps the 50
    // and 900 stops from turning muddy/oversaturated the way holding
    // saturation perfectly constant across the whole range tends to.
    const distanceFromMid = Math.abs(50 - targetL) / 50; // 0 at L=50, 1 at L=0 or L=100
    const taperedS = hsl.s * (1 - distanceFromMid * 0.35);
    scale[step] = hslToHex(hsl.h, taperedS, targetL, 1);
  }
  return scale;
}

/** Builds a CSS `linear-gradient(...)` value from two hex colors and an angle in degrees — used for the Color Studio's gradient preview swatches and the `--ggsp-gradient-*` CSS vars, which can hold a full gradient function as their value just as easily as a solid color. */
export function buildLinearGradient(fromHex: string, toHex: string, angleDeg: number): string {
  return `linear-gradient(${angleDeg}deg, ${fromHex}, ${toHex})`;
}
