"use client";

import { useMemo } from "react";
import { RotateCcw, Image as ImageIcon } from "lucide-react";
import Input from "@/components/ui/Input";
import Button from "@/components/ui/Button";
import { STUDIO_SECTIONS, tokensByStudioSection, type StudioSection, type ThemeToken } from "@/lib/theme-tokens";
import type { BrandDraft } from "./draft-utils";
import ColorStudio from "./ColorStudio";

const SECTION_DESCRIPTIONS: Partial<Record<StudioSection, string>> = {
  identity: "Platform name, tagline, and the text shown in the browser tab and footer.",
  "logos-assets": "Upload, replace, or remove every logo and icon variant the platform uses.",
  colors: "Primary, background, surface, status, navigation, and button colors. 14 of 17 are live platform-wide today — Border and the two Text colors are reserved until they have a safe, scoped target (see each field's note).",
  typography: "Font family, weight, and heading/text style.",
  layout: "Logo sizing and spacing.",
  components: "Corner radius, shadow depth, card treatment, input style, and badge shape — live in preview and sitewide for every card, button, input, and chip.",
  navigation: "Header height and sidebar width.",
  motion: "Light/dark mode defaults and animation intensity.",
};

function FieldLabel({ token }: { token: ThemeToken }) {
  return (
    <div className="flex items-baseline justify-between gap-2">
      <label htmlFor={`token-${token.id}`} className="text-sm font-medium text-white/70">
        {token.label}
      </label>
      {token.helperText && <span className="text-right text-[10px] leading-tight text-white/30">{token.helperText}</span>}
    </div>
  );
}

function TokenField({
  token,
  value,
  onChange,
  onManageAsset,
}: {
  token: ThemeToken;
  value: string | number | boolean | null | undefined;
  onChange: (tokenId: string, value: string | number | boolean | null) => void;
  onManageAsset: (token: ThemeToken) => void;
}) {
  if (token.inputType === "image") {
    return (
      <div className="flex flex-col gap-1.5">
        <FieldLabel token={token} />
        <div className="flex items-center gap-3 rounded-xl border border-white/[0.08] bg-white/[0.03] p-2.5">
          <span className="flex h-11 w-11 flex-none items-center justify-center overflow-hidden rounded-lg bg-white/[0.05]">
            {typeof value === "string" && value ? (
              // eslint-disable-next-line @next/next/no-img-element
              <img src={value} alt="" className="h-full w-full object-contain" />
            ) : (
              <ImageIcon size={16} className="text-white/25" />
            )}
          </span>
          <span className="flex-1 truncate text-xs text-white/45">{typeof value === "string" && value ? "Uploaded" : "Not set — falls back to Main Logo"}</span>
          <Button type="button" variant="secondary" size="md" className="h-9 flex-none px-3 text-xs" onClick={() => onManageAsset(token)}>
            Manage
          </Button>
        </div>
      </div>
    );
  }

  if (token.inputType === "color") {
    const safeValue = typeof value === "string" && value ? value : "#000000";
    return (
      <div className="flex flex-col gap-1.5">
        <FieldLabel token={token} />
        <div className="flex items-center gap-2.5">
          <input
            type="color"
            aria-label={token.label}
            value={safeValue}
            onChange={(e) => onChange(token.id, e.target.value)}
            className="h-11 w-11 flex-none cursor-pointer rounded-lg border border-white/[0.08] bg-transparent p-1"
          />
          <Input
            id={`token-${token.id}`}
            value={safeValue}
            onChange={(e) => onChange(token.id, e.target.value)}
            spellCheck={false}
            className="font-mono text-xs uppercase"
          />
        </div>
      </div>
    );
  }

  if (token.inputType === "toggle") {
    const checked = Boolean(value);
    return (
      <div className="flex items-center justify-between gap-3 rounded-xl border border-white/[0.08] bg-white/[0.03] px-3.5 py-3">
        <span className="text-sm font-medium text-white/70">{token.label}</span>
        <button
          type="button"
          role="switch"
          aria-checked={checked}
          onClick={() => onChange(token.id, !checked)}
          className={`relative h-6 w-11 flex-none rounded-full transition-colors ${checked ? "bg-brand-400" : "bg-white/15"}`}
        >
          <span className={`absolute top-0.5 h-5 w-5 rounded-full bg-white transition-transform ${checked ? "translate-x-[22px]" : "translate-x-0.5"}`} />
        </button>
      </div>
    );
  }

  if (token.inputType === "select") {
    return (
      <div className="flex flex-col gap-1.5">
        <FieldLabel token={token} />
        <select
          id={`token-${token.id}`}
          value={typeof value === "string" ? value : ""}
          onChange={(e) => onChange(token.id, e.target.value)}
          className="h-11 rounded-xl border border-white/[0.08] bg-white/[0.035] px-3 text-sm text-white transition-all focus:border-brand-400/60 focus:bg-white/[0.05] focus:outline-none"
        >
          {(token.options ?? []).map((opt) => (
            <option key={opt} value={opt} className="bg-surface-900">
              {opt}
            </option>
          ))}
        </select>
      </div>
    );
  }

  if (token.inputType === "number") {
    const numValue = typeof value === "number" ? value : typeof token.default === "number" ? token.default : 0;
    if (token.min !== undefined && token.max !== undefined) {
      return (
        <div className="flex flex-col gap-1.5">
          <div className="flex items-baseline justify-between gap-2">
            <label htmlFor={`token-${token.id}`} className="text-sm font-medium text-white/70">
              {token.label}
            </label>
            <span className="font-mono text-xs text-white/50">
              {numValue}
              {token.unit}
            </span>
          </div>
          <input
            id={`token-${token.id}`}
            type="range"
            min={token.min}
            max={token.max}
            step={token.step ?? 1}
            value={numValue}
            onChange={(e) => onChange(token.id, Number(e.target.value))}
            className="w-full accent-brand-400"
          />
          {token.helperText && <span className="text-[10px] leading-tight text-white/30">{token.helperText}</span>}
        </div>
      );
    }
    return (
      <div className="flex flex-col gap-1.5">
        <FieldLabel token={token} />
        <Input
          id={`token-${token.id}`}
          type="number"
          value={typeof value === "number" ? value : ""}
          onChange={(e) => onChange(token.id, e.target.value === "" ? 0 : Number(e.target.value))}
        />
      </div>
    );
  }

  if (token.inputType === "textarea") {
    return (
      <div className="flex flex-col gap-1.5">
        <FieldLabel token={token} />
        <textarea
          id={`token-${token.id}`}
          value={typeof value === "string" ? value : ""}
          onChange={(e) => onChange(token.id, e.target.value)}
          rows={3}
          className="rounded-xl border border-white/[0.08] bg-white/[0.035] px-3 py-2.5 text-sm text-white transition-all placeholder:text-white/25 focus:border-brand-400/60 focus:bg-white/[0.05] focus:outline-none"
        />
      </div>
    );
  }

  // text
  return (
    <div className="flex flex-col gap-1.5">
      <FieldLabel token={token} />
      <Input id={`token-${token.id}`} type="text" value={typeof value === "string" ? value : ""} onChange={(e) => onChange(token.id, e.target.value)} />
    </div>
  );
}

export default function ControlPanel({
  draft,
  activeSection,
  onSectionChange,
  onChange,
  onManageAsset,
  onResetSection,
}: {
  draft: BrandDraft;
  activeSection: StudioSection;
  onSectionChange: (section: StudioSection) => void;
  onChange: (tokenId: string, value: string | number | boolean | null) => void;
  onManageAsset: (token: ThemeToken) => void;
  onResetSection: (section: StudioSection) => void;
}) {
  const sections = useMemo(() => STUDIO_SECTIONS.filter((s) => s.id !== "preview"), []);
  const tokens = useMemo(() => tokensByStudioSection(activeSection).filter((t) => t.level === 1), [activeSection]);

  return (
    <div className="flex h-full min-h-0 flex-col">
      <nav className="flex flex-none flex-wrap gap-1 border-b border-white/[0.06] p-2" aria-label="Brand Studio sections">
        {sections.map((s) => (
          <button
            key={s.id}
            type="button"
            onClick={() => onSectionChange(s.id)}
            aria-current={activeSection === s.id ? "true" : undefined}
            className={`rounded-lg px-3 py-1.5 text-xs font-semibold transition ${
              activeSection === s.id ? "bg-brand-400 text-surface-950" : "text-white/45 hover:bg-white/[0.06] hover:text-white"
            }`}
          >
            {s.label}
          </button>
        ))}
      </nav>

      <div className="flex-1 overflow-y-auto p-4">
        <div className="mb-4 flex items-start justify-between gap-3">
          <p className="text-xs leading-5 text-white/40">{SECTION_DESCRIPTIONS[activeSection]}</p>
          <button
            type="button"
            onClick={() => onResetSection(activeSection)}
            className="flex flex-none items-center gap-1.5 rounded-lg border border-white/[0.08] px-2.5 py-1.5 text-[11px] font-semibold text-white/45 transition hover:border-red-400/30 hover:text-red-300"
            title={`Reset ${STUDIO_SECTIONS.find((s) => s.id === activeSection)?.label} to defaults`}
          >
            <RotateCcw size={12} /> Reset section
          </button>
        </div>

        {activeSection === "colors" ? (
          <ColorStudio draft={draft} onChange={onChange} />
        ) : (
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
            {tokens.map((token) => (
              <div key={token.id} className={token.inputType === "textarea" || token.inputType === "image" ? "sm:col-span-2" : ""}>
                <TokenField token={token} value={draft[token.id]} onChange={onChange} onManageAsset={onManageAsset} />
              </div>
            ))}
            {tokens.length === 0 && <p className="col-span-2 text-sm text-white/30">Nothing to configure in this section yet.</p>}
          </div>
        )}
      </div>
    </div>
  );
}
