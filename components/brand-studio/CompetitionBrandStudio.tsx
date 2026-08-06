"use client";

import { useCallback, useMemo, useState } from "react";
import { Redo2, RotateCcw, Save, Undo2, X } from "lucide-react";
import Button from "@/components/ui/Button";
import { LEVEL_2_TOKENS, type ThemeToken } from "@/lib/theme-tokens";
import type { CompetitionBranding, PlatformBranding } from "@/lib/branding";
import {
  saveCompetitionBranding,
  uploadCompetitionBrandAsset,
  deleteCompetitionBrandAsset,
  addCompetitionSponsorLogo,
  removeCompetitionSponsorLogo,
} from "@/app/admin/competitions/[id]/branding/actions";
import { FieldLabel, TokenField } from "./ControlPanel";
import AssetManager from "./AssetManager";
import LivePreview, { type Viewport } from "./LivePreview";
import type { BrandDraft } from "./draft-utils";
import { draftFromCompetitionBranding, competitionDraftToPreviewDraft } from "./competition-draft-utils";

const MAX_HISTORY = 50;
const GROUPS: { title: string; description: string; sectionIds: ("identity" | "logos-assets" | "colors")[] }[] = [
  { title: "Identity", description: "Overrides the platform's name on this competition's own surfaces.", sectionIds: ["identity"] },
  { title: "Assets", description: "Logo and media specific to this competition.", sectionIds: ["logos-assets"] },
  { title: "Colors", description: "Overrides Primary/Accent Color on this competition's own surfaces.", sectionIds: ["colors"] },
];

function draftsEqual(a: BrandDraft, b: BrandDraft): boolean {
  const keys = new Set([...Object.keys(a), ...Object.keys(b)]);
  for (const key of keys) if (a[key] !== b[key]) return false;
  return true;
}

/**
 * Level 2 (Competition Administrator) Brand Studio — same draft/undo-redo/
 * live-preview architecture as the Level 1 BrandStudio.tsx, deliberately
 * not a rewrite: TokenField, FieldLabel, AssetManager, and the entire
 * LivePreview/PreviewSurface pipeline are the exact same components Level
 * 1 uses, not copies. What's different is scale (10 tokens across 3
 * groups instead of 60+ across 8 sections, so no section rail or search
 * is needed) and the inheritance model — every field can be explicitly
 * reset to "inherit from Platform" rather than having a fixed registry
 * default, and the live preview shows the *resolved* result (competition
 * override where set, platform value otherwise) via
 * competitionDraftToPreviewDraft, the same four-field mapping
 * lib/branding.ts's resolveEffectiveBranding() uses in production.
 */
export default function CompetitionBrandStudio({
  competitionId,
  competitionLabel,
  initial,
  platform,
  canEdit,
}: {
  competitionId: string;
  competitionLabel: string;
  initial: CompetitionBranding;
  platform: PlatformBranding;
  canEdit: boolean;
}) {
  const [savedDraft, setSavedDraft] = useState<BrandDraft>(() => draftFromCompetitionBranding(initial));
  const [draft, setDraft] = useState<BrandDraft>(savedDraft);
  const [history, setHistory] = useState<BrandDraft[]>([]);
  const [future, setFuture] = useState<BrandDraft[]>([]);
  const [sponsorLogos, setSponsorLogos] = useState(initial.sponsorLogos);
  const [managingToken, setManagingToken] = useState<ThemeToken | null>(null);
  const [previewTab, setPreviewTab] = useState<"public" | "broadcast">("public");

  const [confirmSaveOpen, setConfirmSaveOpen] = useState(false);
  const [saving, setSaving] = useState(false);
  const [saveError, setSaveError] = useState<string | null>(null);
  const [savedFlash, setSavedFlash] = useState(false);
  const [sponsorPending, setSponsorPending] = useState(false);
  const [sponsorError, setSponsorError] = useState<string | null>(null);

  const dirty = useMemo(() => !draftsEqual(draft, savedDraft), [draft, savedDraft]);

  const pushHistory = useCallback((current: BrandDraft) => {
    setHistory((h) => [...h.slice(-MAX_HISTORY + 1), current]);
    setFuture([]);
  }, []);

  const handleChange = useCallback(
    (tokenId: string, value: string | number | boolean | null) => {
      setDraft((current) => {
        pushHistory(current);
        return { ...current, [tokenId]: value };
      });
    },
    [pushHistory]
  );

  function handleUndo() {
    setHistory((h) => {
      if (h.length === 0) return h;
      const previous = h[h.length - 1];
      setFuture((f) => [draft, ...f]);
      setDraft(previous);
      return h.slice(0, -1);
    });
  }

  function handleRedo() {
    setFuture((f) => {
      if (f.length === 0) return f;
      const [next, ...rest] = f;
      setHistory((h) => [...h, draft]);
      setDraft(next);
      return rest;
    });
  }

  async function handleConfirmSave() {
    setSaving(true);
    setSaveError(null);
    const result = await saveCompetitionBranding(competitionId, draft);
    setSaving(false);
    if (!result.ok) {
      setSaveError(result.error);
      return;
    }
    setSavedDraft(draft);
    setHistory([]);
    setFuture([]);
    setConfirmSaveOpen(false);
    setSavedFlash(true);
    setTimeout(() => setSavedFlash(false), 3000);
  }

  const changedFields = useMemo(() => {
    const changed: string[] = [];
    for (const token of LEVEL_2_TOKENS) {
      if (draft[token.id] !== savedDraft[token.id]) changed.push(token.label);
    }
    return changed;
  }, [draft, savedDraft]);

  const managingUrl = managingToken && typeof draft[managingToken.id] === "string" ? (draft[managingToken.id] as string) : null;

  const previewDraft = useMemo(() => competitionDraftToPreviewDraft(draft, platform), [draft, platform]);

  async function handleAddSponsor(formData: FormData) {
    setSponsorPending(true);
    setSponsorError(null);
    try {
      const result = await addCompetitionSponsorLogo(competitionId, formData);
      if (!result.ok) {
        setSponsorError(result.error);
        return;
      }
      setSponsorLogos((current) => [...current, result.logo]);
    } finally {
      setSponsorPending(false);
    }
  }

  async function handleRemoveSponsor(id: string) {
    setSponsorPending(true);
    setSponsorError(null);
    try {
      const result = await removeCompetitionSponsorLogo(competitionId, id);
      if (!result.ok) {
        setSponsorError(result.error);
        return;
      }
      setSponsorLogos((current) => current.filter((s) => s.id !== id));
    } finally {
      setSponsorPending(false);
    }
  }

  return (
    <div className="flex h-[calc(100vh-9rem)] min-h-[560px] flex-col overflow-hidden rounded-2xl border border-white/[0.07] bg-surface-900">
      <div className="flex flex-none flex-wrap items-center gap-2 border-b border-white/[0.06] px-4 py-3">
        <div>
          <p className="font-display text-lg font-semibold">{competitionLabel} — Branding</p>
          <p className="text-[11px] text-white/35">Overrides Platform Branding for this competition only. Unset fields inherit the platform&apos;s own values.</p>
        </div>
        {canEdit && (
          <div className="ml-auto flex items-center gap-1.5">
            <button
              type="button"
              onClick={handleUndo}
              disabled={history.length === 0}
              className="rounded-lg border border-white/[0.08] p-2 text-white/45 transition hover:text-white disabled:opacity-30"
              aria-label="Undo"
              title="Undo"
            >
              <Undo2 size={14} />
            </button>
            <button
              type="button"
              onClick={handleRedo}
              disabled={future.length === 0}
              className="rounded-lg border border-white/[0.08] p-2 text-white/45 transition hover:text-white disabled:opacity-30"
              aria-label="Redo"
              title="Redo"
            >
              <Redo2 size={14} />
            </button>
            <div className="mx-1 h-6 w-px bg-white/[0.08]" />
            {dirty && !savedFlash && <span className="rounded-full bg-amber-signal/15 px-2.5 py-1 text-[10px] font-semibold text-amber-signal">Unsaved changes</span>}
            {savedFlash && <span className="rounded-full bg-emerald-400/15 px-2.5 py-1 text-[10px] font-semibold text-emerald-300">Saved</span>}
            <Button type="button" variant="primary" size="md" className="h-9 px-4 text-xs" onClick={() => setConfirmSaveOpen(true)} disabled={!dirty}>
              <Save size={13} /> Save
            </Button>
          </div>
        )}
      </div>

      <div className="flex min-h-0 flex-1 flex-col lg:flex-row">
        <div className="flex-1 overflow-y-auto border-b border-white/[0.06] p-4 lg:w-[440px] lg:flex-none lg:border-b-0 lg:border-r">
          {!canEdit && (
            <p className="mb-4 rounded-lg border border-white/[0.08] bg-white/[0.03] px-3 py-2 text-xs text-white/50">
              You have view-only access to this competition&apos;s branding.
            </p>
          )}

          <div className="flex flex-col gap-5">
            {GROUPS.map((group) => (
              <section key={group.title} className="rounded-xl border border-white/[0.07] bg-white/[0.015] p-4">
                <p className="text-sm font-semibold text-white/85">{group.title}</p>
                <p className="mb-3 text-[11px] leading-4 text-white/35">{group.description}</p>
                <div className="flex flex-col gap-4">
                  {LEVEL_2_TOKENS.filter((t) => group.sectionIds.includes(t.studioSection as "identity" | "logos-assets" | "colors")).map((token) => {
                    const value = draft[token.id];
                    const overridden = typeof value === "string" && value.length > 0;
                    return (
                      <div key={token.id}>
                        <div className="mb-1 flex items-center gap-2">
                          <span
                            className={`rounded-full px-2 py-0.5 text-[9px] font-semibold uppercase tracking-wide ${
                              overridden ? "bg-brand-400/15 text-brand-400" : "bg-white/[0.05] text-white/35"
                            }`}
                          >
                            {overridden ? "Overridden" : "Inherited"}
                          </span>
                          {overridden && canEdit && (
                            <button
                              type="button"
                              onClick={() => handleChange(token.id, null)}
                              className="flex items-center gap-1 text-[10px] font-medium text-white/35 hover:text-white"
                            >
                              <RotateCcw size={10} /> Reset to inherited
                            </button>
                          )}
                        </div>
                        {token.inputType === "image" ? (
                          <div className="flex flex-col gap-1.5">
                            <FieldLabel token={token} />
                            <div className="flex items-center gap-3 rounded-xl border border-white/[0.08] bg-white/[0.03] p-2.5">
                              <span className="flex h-11 w-11 flex-none items-center justify-center overflow-hidden rounded-lg bg-white/[0.05]">
                                {typeof value === "string" && value ? (
                                  // eslint-disable-next-line @next/next/no-img-element
                                  <img src={value} alt="" className="h-full w-full object-contain" />
                                ) : (
                                  <span className="text-[9px] text-white/25">None</span>
                                )}
                              </span>
                              <span className="flex-1 truncate text-xs text-white/45">{typeof value === "string" && value ? "Uploaded" : "Inherits from Platform"}</span>
                              {canEdit && (
                                <Button type="button" variant="secondary" size="md" className="h-9 flex-none px-3 text-xs" onClick={() => setManagingToken(token)}>
                                  Manage
                                </Button>
                              )}
                            </div>
                          </div>
                        ) : (
                          <TokenField token={token} value={value} onChange={canEdit ? handleChange : () => {}} onManageAsset={() => {}} />
                        )}
                      </div>
                    );
                  })}
                </div>
              </section>
            ))}

            <section className="rounded-xl border border-white/[0.07] bg-white/[0.015] p-4">
              <p className="text-sm font-semibold text-white/85">Sponsor Logos</p>
              <p className="mb-3 text-[11px] leading-4 text-white/35">A gallery of sponsor marks for this competition. Saved immediately — not part of the draft above.</p>
              {sponsorLogos.length > 0 && (
                <div className="mb-3 grid grid-cols-3 gap-2">
                  {sponsorLogos.map((logo) => (
                    <div key={logo.id} className="group relative flex h-16 items-center justify-center rounded-lg border border-white/[0.08] bg-white p-2">
                      {/* eslint-disable-next-line @next/next/no-img-element */}
                      <img src={logo.logoUrl} alt={logo.sponsorName ?? ""} className="max-h-full max-w-full object-contain" />
                      {canEdit && (
                        <button
                          type="button"
                          onClick={() => handleRemoveSponsor(logo.id)}
                          disabled={sponsorPending}
                          className="absolute -right-1.5 -top-1.5 hidden h-5 w-5 items-center justify-center rounded-full bg-red-500 text-white group-hover:flex"
                          aria-label="Remove sponsor logo"
                        >
                          <X size={11} />
                        </button>
                      )}
                    </div>
                  ))}
                </div>
              )}
              {sponsorError && <p className="mb-2 text-xs text-red-300">{sponsorError}</p>}
              {canEdit && (
                <form
                  action={(formData) => {
                    void handleAddSponsor(formData);
                  }}
                  className="flex flex-wrap items-center gap-2"
                >
                  <input type="text" name="sponsorName" placeholder="Sponsor name (optional)" className="h-9 flex-1 rounded-lg border border-white/[0.08] bg-white/[0.03] px-2.5 text-xs text-white placeholder:text-white/25 focus:border-brand-400/60 focus:outline-none" />
                  <input type="file" name="file" accept="image/*" required className="text-xs text-white/50 file:mr-2 file:rounded-lg file:border-0 file:bg-white/[0.07] file:px-2.5 file:py-1.5 file:text-[11px] file:font-semibold file:text-white" />
                  <Button type="submit" variant="secondary" size="md" className="h-9 px-3 text-xs" disabled={sponsorPending}>
                    Add
                  </Button>
                </form>
              )}
            </section>
          </div>
        </div>

        <div className="flex min-h-0 flex-1 flex-col">
          <nav className="flex flex-none gap-1 border-b border-white/[0.06] p-2" aria-label="Preview surface">
            {([
              { id: "public", label: "Public Website" },
              { id: "broadcast", label: "Broadcast Control Room" },
            ] as const).map((t) => (
              <button
                key={t.id}
                type="button"
                onClick={() => setPreviewTab(t.id)}
                aria-current={previewTab === t.id ? "true" : undefined}
                className={`rounded-lg px-3 py-1.5 text-xs font-semibold transition ${
                  previewTab === t.id ? "bg-brand-400 text-surface-950" : "text-white/45 hover:bg-white/[0.06] hover:text-white"
                }`}
              >
                {t.label}
              </button>
            ))}
          </nav>
          <div className="min-h-[420px] flex-1 overflow-auto p-4 lg:min-h-0">
            <LivePreview draft={previewDraft} saved={platform} tab={previewTab} viewport={"desktop" as Viewport} />
          </div>
        </div>
      </div>

      {managingToken && (
        <AssetManager
          token={managingToken}
          currentUrl={managingUrl}
          fallbackUrl={null}
          fallbackLabel="the platform default"
          onClose={() => setManagingToken(null)}
          onChange={(url) => handleChange(managingToken.id, url)}
          onUpload={(file) => {
            const formData = new FormData();
            formData.append("file", file);
            return uploadCompetitionBrandAsset(competitionId, managingToken.id, formData);
          }}
          onDelete={() => deleteCompetitionBrandAsset(competitionId, managingToken.id, managingToken.column)}
        />
      )}

      {confirmSaveOpen && (
        <div className="fixed inset-0 z-[80] flex items-center justify-center bg-black/70 p-4 backdrop-blur-sm">
          <div className="surface-panel-solid w-full max-w-sm p-5">
            <p className="text-sm font-semibold">Save branding changes?</p>
            {changedFields.length > 0 ? (
              <div className="mt-2 max-h-40 overflow-y-auto rounded-lg bg-white/[0.03] p-2.5">
                <p className="mb-1 text-[10px] font-semibold uppercase tracking-wide text-white/30">{changedFields.length} field{changedFields.length === 1 ? "" : "s"} changed</p>
                <ul className="space-y-0.5 text-xs text-white/60">
                  {changedFields.map((f) => (
                    <li key={f}>{f}</li>
                  ))}
                </ul>
              </div>
            ) : (
              <p className="mt-2 text-xs text-white/45">No changes to save.</p>
            )}
            <p className="mt-3 text-xs leading-5 text-white/45">This applies to {competitionLabel} immediately.</p>
            {saveError && <p className="mt-2 text-xs text-red-300">{saveError}</p>}
            <div className="mt-4 flex justify-end gap-2">
              <Button type="button" variant="ghost" onClick={() => setConfirmSaveOpen(false)} disabled={saving}>
                Cancel
              </Button>
              <Button type="button" variant="primary" onClick={handleConfirmSave} disabled={saving || changedFields.length === 0}>
                {saving ? "Saving…" : "Confirm & save"}
              </Button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
