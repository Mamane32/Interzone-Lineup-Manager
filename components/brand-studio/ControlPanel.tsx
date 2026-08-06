"use client";

import { useMemo, useState } from "react";
import {
  RotateCcw,
  Image as ImageIcon,
  Fingerprint,
  Palette,
  Type,
  Ruler,
  SlidersHorizontal,
  PanelTop,
  Zap,
  Search,
  X,
  type LucideIcon,
} from "lucide-react";
import Input from "@/components/ui/Input";
import Button from "@/components/ui/Button";
import { LEVEL_1_TOKENS, STUDIO_SECTIONS, tokensByStudioSection, type StudioSection, type ThemeToken } from "@/lib/theme-tokens";
import type { BrandDraft } from "./draft-utils";
import ColorStudio from "./ColorStudio";
import AssetGrid from "./AssetGrid";

const SECTION_DESCRIPTIONS: Partial<Record<StudioSection, string>> = {
  identity: "Platform name, tagline, and the text shown in the browser tab and footer.",
  "logos-assets": "Upload, replace, crop, or download every logo and icon variant. Main Logo is live sitewide; the rest preview here and are marked Reserved until a real page adopts them.",
  colors: "Primary, background, surface, status, navigation, and button colors. 14 of 17 are live platform-wide today — Border and the two Text colors are reserved until they have a safe, scoped target (see each field's note).",
  typography: "Font family, weight, and heading/text style.",
  layout: "Logo sizing and spacing.",
  components: "Corner radius, shadow depth, card treatment, input style, and badge shape — live in preview and sitewide for every card, button, input, and chip.",
  navigation: "Header height and sidebar width.",
  motion: "Light/dark mode defaults and animation intensity.",
};

const SECTION_ICONS: Partial<Record<StudioSection, LucideIcon>> = {
  identity: Fingerprint,
  "logos-assets": ImageIcon,
  colors: Palette,
  typography: Type,
  layout: Ruler,
  components: SlidersHorizontal,
  navigation: PanelTop,
  motion: Zap,
};

/** Groups the flat STUDIO_SECTIONS list for the section rail's visual hierarchy — purely presentational, so it lives here rather than in lib/theme-tokens.ts's data registry. */
const SECTION_GROUPS: { label: string; sections: StudioSection[] }[] = [
  { label: "Brand Identity", sections: ["identity", "logos-assets"] },
  { label: "Design System", sections: ["colors", "typography", "components"] },
  { label: "Layout & Navigation", sections: ["layout", "navigation"] },
  { label: "Behavior", sections: ["motion"] },
];

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
  const [query, setQuery] = useState("");
  const sectionLabel = useMemo(() => new Map(STUDIO_SECTIONS.map((s) => [s.id, s.label])), []);
  const tokens = useMemo(() => tokensByStudioSection(activeSection).filter((t) => t.level === 1), [activeSection]);

  const trimmedQuery = query.trim().toLowerCase();
  const searchResults = useMemo(() => {
    if (!trimmedQuery) return [];
    return LEVEL_1_TOKENS.filter(
      (t) => t.label.toLowerCase().includes(trimmedQuery) || t.helperText?.toLowerCase().includes(trimmedQuery)
    );
  }, [trimmedQuery]);

  return (
    <div className="flex h-full min-h-0 flex-col lg:flex-row">
      {/* Section rail — a horizontal scrolling strip of icon chips on
         narrow screens (saves vertical space, since the fields below still
         need most of the viewport there), a grouped vertical list with
         group headers on lg+, matching the sidebar's own group-header
         pattern (components/shell/AppShell.tsx) for a consistent hierarchy
         instead of the old flat wrapping row. */}
      <nav
        className="flex flex-none gap-1 overflow-x-auto border-b border-white/[0.06] p-2 lg:w-48 lg:flex-col lg:overflow-visible lg:border-b-0 lg:border-r lg:p-3"
        aria-label="Brand Studio sections"
      >
        {SECTION_GROUPS.map((group) => (
          <div key={group.label} className="contents lg:mb-4 lg:block lg:last:mb-0">
            <p className="hidden px-1 pb-1.5 text-[10px] font-semibold uppercase tracking-[.16em] text-white/25 lg:block">{group.label}</p>
            <div className="flex flex-none gap-1 lg:flex-col">
              {group.sections.map((id) => {
                const Icon = SECTION_ICONS[id];
                const label = sectionLabel.get(id) ?? id;
                return (
                  <button
                    key={id}
                    type="button"
                    onClick={() => {
                      setQuery("");
                      onSectionChange(id);
                    }}
                    aria-current={!trimmedQuery && activeSection === id ? "true" : undefined}
                    className={`flex flex-none items-center gap-2 rounded-lg px-3 py-1.5 text-xs font-semibold transition lg:w-full ${
                      !trimmedQuery && activeSection === id ? "bg-brand-400 text-surface-950" : "text-white/45 hover:bg-white/[0.06] hover:text-white"
                    }`}
                  >
                    {Icon && <Icon size={14} className="flex-none" />}
                    <span className="whitespace-nowrap">{label}</span>
                  </button>
                );
              })}
            </div>
          </div>
        ))}
      </nav>

      <div className="flex min-h-0 flex-1 flex-col">
        <div className="flex-none border-b border-white/[0.06] p-3">
          <div className="relative">
            <Search size={14} className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-white/25" />
            <input
              type="text"
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              placeholder="Search every setting…"
              aria-label="Search Brand Studio settings"
              className="h-10 w-full rounded-xl border border-white/[0.08] bg-white/[0.035] pl-9 pr-9 text-sm text-white transition-all placeholder:text-white/25 focus:border-brand-400/60 focus:bg-white/[0.05] focus:outline-none"
            />
            {query && (
              <button
                type="button"
                onClick={() => setQuery("")}
                aria-label="Clear search"
                className="absolute right-2.5 top-1/2 -translate-y-1/2 text-white/30 hover:text-white"
              >
                <X size={14} />
              </button>
            )}
          </div>
        </div>

        <div className="flex-1 overflow-y-auto p-4">
          {trimmedQuery ? (
            <div className="flex flex-col gap-4">
              <p className="text-xs text-white/40">
                {searchResults.length === 0
                  ? `No settings match "${query.trim()}".`
                  : `${searchResults.length} setting${searchResults.length === 1 ? "" : "s"} match "${query.trim()}".`}
              </p>
              <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
                {searchResults.map((token) => (
                  <div key={token.id} className={token.inputType === "textarea" || token.inputType === "image" ? "sm:col-span-2" : ""}>
                    <span className="mb-1 inline-block rounded-full bg-white/[0.05] px-2 py-0.5 text-[9px] font-semibold uppercase tracking-wide text-white/35">
                      {sectionLabel.get(token.studioSection)}
                    </span>
                    <TokenField token={token} value={draft[token.id]} onChange={onChange} onManageAsset={onManageAsset} />
                  </div>
                ))}
              </div>
            </div>
          ) : (
            <>
              <div className="mb-4 flex items-start justify-between gap-3">
                <p className="text-xs leading-5 text-white/40">{SECTION_DESCRIPTIONS[activeSection]}</p>
                <button
                  type="button"
                  onClick={() => onResetSection(activeSection)}
                  className="flex flex-none items-center gap-1.5 rounded-lg border border-white/[0.08] px-2.5 py-1.5 text-[11px] font-semibold text-white/45 transition hover:border-red-400/30 hover:text-red-300"
                  title={`Reset ${sectionLabel.get(activeSection)} to defaults`}
                >
                  <RotateCcw size={12} /> Reset section
                </button>
              </div>

              {activeSection === "colors" ? (
                <ColorStudio draft={draft} onChange={onChange} />
              ) : activeSection === "logos-assets" ? (
                <AssetGrid draft={draft} onManageAsset={onManageAsset} />
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
            </>
          )}
        </div>
      </div>
    </div>
  );
}
