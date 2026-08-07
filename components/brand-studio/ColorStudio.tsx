"use client";

import { useEffect, useState } from "react";
import { colorTokensByGroup, type ColorGroup, type ThemeToken } from "@/lib/theme-tokens";
import {
  hexToRgb,
  rgbToHex,
  hexToHsl,
  hslToHex,
  isValidColorHex,
  generateColorScale,
  buildLinearGradient,
  COLOR_SCALE_STEPS,
} from "@/lib/color-utils";
import type { BrandDraft } from "./draft-utils";

const GROUP_ORDER: ColorGroup[] = ["primary", "secondary", "accent", "semantic", "surface", "text", "legacy"];

const GROUP_META: Record<ColorGroup, { label: string; description: string }> = {
  primary: { label: "Primary", description: "The platform's main accent — CTA buttons, active states, highlights." },
  secondary: { label: "Secondary", description: "A supporting brand color, independent of Primary." },
  accent: { label: "Accent", description: "A second highlight color for hero/button surfaces." },
  semantic: { label: "Status", description: "Success, warning, danger, and info states across the platform." },
  surface: { label: "Surface", description: "Backgrounds, cards, and borders." },
  text: { label: "Text", description: "Body text colors." },
  legacy: { label: "Additional Surfaces", description: "Scoped overrides for specific chrome — see each field's note for exactly what it controls." },
};

// Only groups with a single "base" token (± a gradient pair) get the
// bigger base-color treatment (scale strip, gradient controls). Groups
// that are several independent colors (Status, Surface, Text, Additional
// Surfaces) render as a grid of individually-equal ColorCards instead.
const BASE_STYLE_GROUPS = new Set<ColorGroup>(["primary", "secondary", "accent"]);

function asHex(value: string | number | boolean | null | undefined, fallback: string): string {
  return typeof value === "string" && isValidColorHex(value) ? value : fallback;
}

function defaultHexOf(token: ThemeToken): string {
  return typeof token.default === "string" && isValidColorHex(token.default) ? token.default : "#000000";
}

/**
 * Replaces ControlPanel's generic token grid for the Colors section.
 * Groups every color token by lib/theme-tokens.ts's `colorGroup` (the same
 * grouping the registry's own doc comments describe as "what ColorStudio.tsx
 * clusters swatches into" — that component didn't exist until now, only
 * the comment referencing it did) and gives Primary/Secondary/Accent their
 * live 50–900 scale + gradient controls. Every edit calls the same
 * `onChange(tokenId, value)` BrandStudio.tsx already wires to draft state,
 * undo/redo, and the live preview iframe — this component owns no branding
 * state of its own, only the hex<->rgb<->hsl text-sync per field.
 */
export default function ColorStudio({
  draft,
  onChange,
}: {
  draft: BrandDraft;
  onChange: (tokenId: string, value: string | number | boolean | null) => void;
}) {
  return (
    <div className="flex flex-col gap-4">
      {GROUP_ORDER.map((group) => {
        const tokens = colorTokensByGroup(group);
        if (tokens.length === 0) return null;
        const meta = GROUP_META[group];

        return (
          <section key={group} className="rounded-2xl border border-white/[0.07] bg-white/[0.015] p-4">
            <div className="mb-3">
              <p className="font-display text-xs font-bold uppercase tracking-wide text-brand-400">{meta.label}</p>
              <p className="mt-0.5 text-[11px] leading-tight text-white/35">{meta.description}</p>
            </div>

            {BASE_STYLE_GROUPS.has(group) ? (
              <BaseColorGroup tokens={tokens} draft={draft} onChange={onChange} />
            ) : (
              <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
                {tokens.map((token) => (
                  <ColorCard key={token.id} token={token} value={asHex(draft[token.id], defaultHexOf(token))} onChange={(hex) => onChange(token.id, hex)} />
                ))}
              </div>
            )}
          </section>
        );
      })}
    </div>
  );
}

function BaseColorGroup({
  tokens,
  draft,
  onChange,
}: {
  tokens: ThemeToken[];
  draft: BrandDraft;
  onChange: (tokenId: string, value: string | number | boolean | null) => void;
}) {
  const baseToken = tokens.find((t) => t.colorRole === "base") ?? tokens[0];
  const gradientEnabledToken = tokens.find((t) => t.colorRole === "gradientEnabled");
  const gradientEndToken = tokens.find((t) => t.colorRole === "gradientEnd");
  const gradientAngleToken = tokens.find((t) => t.colorRole === "gradientAngle");

  const baseHex = asHex(draft[baseToken.id], defaultHexOf(baseToken));
  const scale = generateColorScale(baseHex);

  return (
    <div className="flex flex-col gap-4">
      <ColorCard token={baseToken} value={baseHex} onChange={(hex) => onChange(baseToken.id, hex)} />

      <div>
        <p className="mb-1.5 text-[10px] font-semibold uppercase tracking-wide text-white/30">Live scale · 50–900</p>
        <div className="flex overflow-hidden rounded-lg border border-white/10">
          {COLOR_SCALE_STEPS.map((step) => (
            <div key={step} className="group relative h-10 flex-1" style={{ backgroundColor: scale[step] }} title={`${step} — ${scale[step]}`}>
              <span className="pointer-events-none absolute inset-x-0 bottom-0.5 text-center text-[8px] font-bold text-white opacity-0 mix-blend-difference transition-opacity group-hover:opacity-80">
                {step}
              </span>
            </div>
          ))}
        </div>
      </div>

      {gradientEnabledToken && gradientEndToken && gradientAngleToken && (
        <GradientControls
          baseHex={baseHex}
          enabled={Boolean(draft[gradientEnabledToken.id])}
          endHex={asHex(draft[gradientEndToken.id], defaultHexOf(gradientEndToken))}
          angle={typeof draft[gradientAngleToken.id] === "number" ? (draft[gradientAngleToken.id] as number) : typeof gradientAngleToken.default === "number" ? gradientAngleToken.default : 135}
          onToggle={(v) => onChange(gradientEnabledToken.id, v)}
          onEndChange={(hex) => onChange(gradientEndToken.id, hex)}
          onAngleChange={(deg) => onChange(gradientAngleToken.id, deg)}
        />
      )}
    </div>
  );
}

function ColorCard({ token, value, onChange }: { token: ThemeToken; value: string; onChange: (hex: string) => void }) {
  const rgb = hexToRgb(value) ?? { r: 0, g: 0, b: 0, a: 1 };
  const hsl = hexToHsl(value) ?? { h: 0, s: 0, l: 0, a: 1 };

  const [rgbText, setRgbText] = useState(`${rgb.r}, ${rgb.g}, ${rgb.b}`);
  const [hslText, setHslText] = useState(`${Math.round(hsl.h)}, ${Math.round(hsl.s)}%, ${Math.round(hsl.l)}%`);

  // Re-sync the RGB/HSL text fields whenever the underlying hex changes
  // from elsewhere (the hex field itself, the native picker, Undo/Redo,
  // Reset section) — otherwise they'd keep showing a stale value.
  useEffect(() => {
    setRgbText(`${rgb.r}, ${rgb.g}, ${rgb.b}`);
    setHslText(`${Math.round(hsl.h)}, ${Math.round(hsl.s)}%, ${Math.round(hsl.l)}%`);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [value]);

  function commitRgb(text: string) {
    const m = text.match(/(\d{1,3})\D+(\d{1,3})\D+(\d{1,3})/);
    if (!m) return;
    const [r, g, b] = [Number(m[1]), Number(m[2]), Number(m[3])];
    if ([r, g, b].some((n) => n < 0 || n > 255)) return;
    onChange(rgbToHex({ r, g, b }));
  }

  function commitHsl(text: string) {
    const m = text.match(/(\d{1,3})\D+(\d{1,3})\D+(\d{1,3})/);
    if (!m) return;
    const [h, s, l] = [Number(m[1]), Number(m[2]), Number(m[3])];
    if (h < 0 || h > 360 || s < 0 || s > 100 || l < 0 || l > 100) return;
    onChange(hslToHex(h, s, l));
  }

  return (
    <div className="rounded-xl border border-white/[0.08] bg-white/[0.025] p-3">
      <div className="flex items-center gap-3">
        <input
          type="color"
          aria-label={token.label}
          value={value.slice(0, 7)}
          onChange={(e) => onChange(e.target.value)}
          className="h-11 w-11 flex-none cursor-pointer rounded-lg border border-white/[0.08] bg-transparent p-1"
        />
        <div className="min-w-0 flex-1">
          <p className="text-sm font-semibold text-white/85">{token.label}</p>
          {token.helperText && <p className="text-[11px] leading-tight text-white/35">{token.helperText}</p>}
        </div>
      </div>

      <div className="mt-3 grid grid-cols-3 gap-1.5">
        <LabeledField label="Hex">
          <input
            value={value}
            onChange={(e) => {
              if (isValidColorHex(e.target.value)) onChange(e.target.value);
            }}
            spellCheck={false}
            className="w-full bg-transparent font-mono text-[11px] uppercase text-white/80 outline-none"
          />
        </LabeledField>
        <LabeledField label="RGB">
          <input
            value={rgbText}
            onChange={(e) => setRgbText(e.target.value)}
            onBlur={(e) => commitRgb(e.target.value)}
            spellCheck={false}
            className="w-full bg-transparent font-mono text-[11px] text-white/80 outline-none"
          />
        </LabeledField>
        <LabeledField label="HSL">
          <input
            value={hslText}
            onChange={(e) => setHslText(e.target.value)}
            onBlur={(e) => commitHsl(e.target.value)}
            spellCheck={false}
            className="w-full bg-transparent font-mono text-[11px] text-white/80 outline-none"
          />
        </LabeledField>
      </div>
    </div>
  );
}

function LabeledField({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div className="rounded-lg border border-white/[0.06] bg-black/20 px-2 py-1.5">
      <p className="text-[8px] font-semibold uppercase tracking-wide text-white/25">{label}</p>
      {children}
    </div>
  );
}

function GradientControls({
  baseHex,
  enabled,
  endHex,
  angle,
  onToggle,
  onEndChange,
  onAngleChange,
}: {
  baseHex: string;
  enabled: boolean;
  endHex: string;
  angle: number;
  onToggle: (value: boolean) => void;
  onEndChange: (hex: string) => void;
  onAngleChange: (deg: number) => void;
}) {
  return (
    <div className="rounded-xl border border-white/[0.08] bg-white/[0.025] p-3">
      <div className="flex items-center justify-between">
        <span className="text-xs font-semibold text-white/70">Gradient</span>
        <button
          type="button"
          role="switch"
          aria-checked={enabled}
          onClick={() => onToggle(!enabled)}
          className={`relative h-6 w-11 flex-none rounded-full transition-colors ${enabled ? "bg-brand-400" : "bg-white/15"}`}
        >
          <span className={`absolute top-0.5 h-5 w-5 rounded-full bg-white transition-transform ${enabled ? "translate-x-[22px]" : "translate-x-0.5"}`} />
        </button>
      </div>

      {enabled && (
        <div className="mt-3 flex flex-col gap-3">
          <div className="h-14 rounded-lg border border-white/10" style={{ backgroundImage: buildLinearGradient(baseHex, endHex, angle) }} />
          <div className="flex items-center gap-3">
            <input
              type="color"
              aria-label="Gradient end color"
              value={endHex.slice(0, 7)}
              onChange={(e) => onEndChange(e.target.value)}
              className="h-9 w-9 flex-none cursor-pointer rounded-lg border border-white/[0.08] bg-transparent p-1"
            />
            <div className="flex-1">
              <p className="mb-1 text-[9px] font-semibold uppercase tracking-wide text-white/25">Angle — {angle}°</p>
              <input type="range" min={0} max={360} value={angle} onChange={(e) => onAngleChange(Number(e.target.value))} className="w-full accent-brand-400" />
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
