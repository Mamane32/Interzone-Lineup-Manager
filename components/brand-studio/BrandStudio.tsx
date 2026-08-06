"use client";

import { useCallback, useMemo, useState } from "react";
import { History, Laptop, Redo2, RotateCcw, Save, Smartphone, Tablet, Undo2 } from "lucide-react";
import Button from "@/components/ui/Button";
import { useEscapeKey } from "@/lib/hooks";
import { LEVEL_1_TOKENS, tokensByStudioSection, type StudioSection, type ThemeToken } from "@/lib/theme-tokens";
import type { PlatformBranding } from "@/lib/branding";
import { savePlatformBranding, uploadPlatformBrandAsset, deletePlatformBrandAsset } from "@/app/admin/brand-studio/actions";
import { draftFromPlatformBranding, type BrandDraft } from "./draft-utils";
import ControlPanel, { displayValue } from "./ControlPanel";
import LivePreview, { PREVIEW_TABS, type PreviewTab, type Viewport } from "./LivePreview";
import AssetManager from "./AssetManager";
import VersionHistoryPanel from "./VersionHistoryPanel";

const MAX_HISTORY = 50;

function draftsEqual(a: BrandDraft, b: BrandDraft): boolean {
  const keys = new Set([...Object.keys(a), ...Object.keys(b)]);
  for (const key of keys) if (a[key] !== b[key]) return false;
  return true;
}

export default function BrandStudio({ initial }: { initial: PlatformBranding }) {
  const [savedDraft, setSavedDraft] = useState<BrandDraft>(() => draftFromPlatformBranding(initial));
  const [draft, setDraft] = useState<BrandDraft>(savedDraft);
  const [history, setHistory] = useState<BrandDraft[]>([]);
  const [future, setFuture] = useState<BrandDraft[]>([]);

  const [activeSection, setActiveSection] = useState<StudioSection>("identity");
  const [previewTab, setPreviewTab] = useState<PreviewTab>("dashboard");
  const [viewport, setViewport] = useState<Viewport>("desktop");
  const [managingToken, setManagingToken] = useState<ThemeToken | null>(null);

  const [confirmSaveOpen, setConfirmSaveOpen] = useState(false);
  const [confirmResetAllOpen, setConfirmResetAllOpen] = useState(false);
  const [versionHistoryOpen, setVersionHistoryOpen] = useState(false);
  const [publishNote, setPublishNote] = useState("");
  const [saving, setSaving] = useState(false);
  const [saveError, setSaveError] = useState<string | null>(null);
  const [savedFlash, setSavedFlash] = useState(false);

  useEscapeKey(
    () => {
      if (confirmSaveOpen) setConfirmSaveOpen(false);
      else if (confirmResetAllOpen) setConfirmResetAllOpen(false);
    },
    confirmSaveOpen || confirmResetAllOpen
  );

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

  /** Like handleChange, but for controls that need to set several tokens at once as a single undo step — e.g. an Animation Speed preset button that also flips Reduced Motion off, or a future "reset to inherited" action. Without this, a multi-field control would either need N separate onChange calls (N separate, confusing undo steps for what the admin experienced as one click) or duplicate pushHistory/setDraft wiring per caller. */
  const handleBatchChange = useCallback(
    (patch: Record<string, string | number | boolean | null>) => {
      setDraft((current) => {
        pushHistory(current);
        return { ...current, ...patch };
      });
    },
    [pushHistory]
  );

  const handleAssetApplied = useCallback(
    (tokenId: string, url: string | null) => {
      setDraft((current) => {
        pushHistory(current);
        return { ...current, [tokenId]: url };
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

  function handleResetSection(section: StudioSection) {
    const tokens = tokensByStudioSection(section).filter((t) => t.level === 1);
    if (tokens.length === 0) return;
    setDraft((current) => {
      pushHistory(current);
      const next = { ...current };
      for (const t of tokens) next[t.id] = t.default;
      return next;
    });
  }

  function handleResetAll() {
    setDraft((current) => {
      pushHistory(current);
      const next = { ...current };
      for (const t of LEVEL_1_TOKENS) next[t.id] = t.default;
      return next;
    });
    setConfirmResetAllOpen(false);
  }

  async function handleConfirmSave() {
    setSaving(true);
    setSaveError(null);
    const result = await savePlatformBranding(draft, publishNote);
    setSaving(false);
    if (!result.ok) {
      setSaveError(result.error);
      return;
    }
    setSavedDraft(draft);
    setHistory([]);
    setFuture([]);
    setConfirmSaveOpen(false);
    setPublishNote("");
    setSavedFlash(true);
    setTimeout(() => setSavedFlash(false), 3000);
  }

  function handleRestoreVersion(restored: BrandDraft) {
    setDraft((current) => {
      pushHistory(current);
      return { ...current, ...restored };
    });
  }

  const changedTokens = useMemo(() => {
    return LEVEL_1_TOKENS.filter((token) => draft[token.id] !== savedDraft[token.id]);
  }, [draft, savedDraft]);

  const managingUrl = managingToken ? (typeof draft[managingToken.id] === "string" ? (draft[managingToken.id] as string) : null) : null;
  const mainLogoUrl = typeof draft.mainLogo === "string" ? (draft.mainLogo as string) : null;

  return (
    <div className="flex flex-col overflow-hidden rounded-2xl border border-white/[0.07] bg-surface-900 lg:h-[calc(100vh-6rem)] lg:min-h-[640px]">
      {/* Top bar — reset all, undo/redo, unsaved indicator, viewport switcher, save. */}
      <div className="flex flex-none flex-wrap items-center gap-2 border-b border-white/[0.06] px-4 py-3">
        <div>
          <p className="font-display text-lg font-semibold">Brand Studio</p>
          <p className="text-[11px] text-white/35">Platform-wide branding — changes preview instantly, publish when ready.</p>
        </div>

        <div className="ml-auto flex items-center gap-1.5">
          <button
            type="button"
            onClick={() => setConfirmResetAllOpen(true)}
            className="flex items-center gap-1.5 rounded-lg border border-white/[0.08] px-2.5 py-1.5 text-[11px] font-semibold text-white/45 transition hover:border-red-400/30 hover:text-red-300"
          >
            <RotateCcw size={12} /> Reset all
          </button>

          <div className="mx-1 h-6 w-px bg-white/[0.08]" />

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

          <div className="flex items-center gap-0.5 rounded-lg border border-white/[0.08] p-0.5">
            {([
              ["desktop", Laptop],
              ["tablet", Tablet],
              ["mobile", Smartphone],
            ] as const).map(([id, Icon]) => (
              <button
                key={id}
                type="button"
                onClick={() => setViewport(id)}
                className={`rounded-md p-1.5 transition ${viewport === id ? "bg-brand-400 text-surface-950" : "text-white/40 hover:text-white"}`}
                aria-label={`${id} viewport`}
                title={`${id[0].toUpperCase()}${id.slice(1)} viewport`}
              >
                <Icon size={14} />
              </button>
            ))}
          </div>

          <button
            type="button"
            onClick={() => setVersionHistoryOpen(true)}
            className="flex items-center gap-1.5 rounded-lg border border-white/[0.08] px-2.5 py-1.5 text-[11px] font-semibold text-white/45 transition hover:text-white"
          >
            <History size={12} /> Version History
          </button>

          <div className="mx-1 h-6 w-px bg-white/[0.08]" />

          {dirty && !savedFlash && <span className="rounded-full bg-amber-signal/15 px-2.5 py-1 text-[10px] font-semibold text-amber-signal">Unpublished changes</span>}
          {savedFlash && <span className="rounded-full bg-emerald-400/15 px-2.5 py-1 text-[10px] font-semibold text-emerald-300">Published</span>}

          <Button type="button" variant="primary" size="md" className="h-9 px-4 text-xs" onClick={() => setConfirmSaveOpen(true)} disabled={!dirty}>
            <Save size={13} /> Publish
          </Button>
        </div>
      </div>

      {/* Two-panel workspace — stacked (edit panel above preview) below
         lg, since side-by-side 420px-plus-preview never fits a phone
         width; side-by-side with each panel independently scrollable
         inside the fixed-height shell from lg up. */}
      <div className="flex min-h-0 flex-1 flex-col lg:flex-row">
        <div className="flex-none border-b border-white/[0.06] lg:w-[420px] lg:border-b-0 lg:border-r">
          <ControlPanel
            draft={draft}
            activeSection={activeSection}
            onSectionChange={setActiveSection}
            onChange={handleChange}
            onBatchChange={handleBatchChange}
            onManageAsset={setManagingToken}
            onResetSection={handleResetSection}
          />
        </div>

        <div className="flex min-h-0 flex-1 flex-col">
          <nav className="flex flex-none flex-wrap gap-1 border-b border-white/[0.06] p-2" aria-label="Preview surface">
            {PREVIEW_TABS.map((t) => (
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
            <LivePreview draft={draft} saved={initial} tab={previewTab} viewport={viewport} />
          </div>
        </div>
      </div>

      {managingToken && (
        <AssetManager
          token={managingToken}
          currentUrl={managingUrl}
          fallbackUrl={managingToken.id === "mainLogo" ? null : mainLogoUrl}
          fallbackLabel="Main Logo"
          onClose={() => setManagingToken(null)}
          onChange={(url) => handleAssetApplied(managingToken.id, url)}
          onUpload={(file) => {
            const formData = new FormData();
            formData.append("file", file);
            return uploadPlatformBrandAsset(managingToken.id, formData);
          }}
          onDelete={() => deletePlatformBrandAsset(managingToken.id, managingToken.column)}
        />
      )}

      {confirmResetAllOpen && (
        <div className="fixed inset-0 z-[80] flex items-center justify-center bg-black/70 p-4 backdrop-blur-sm">
          <div className="surface-panel-solid w-full max-w-sm p-5" role="alertdialog" aria-modal="true" aria-labelledby="reset-all-title">
            <p id="reset-all-title" className="text-sm font-semibold">Reset all branding?</p>
            <p className="mt-2 text-xs leading-5 text-white/45">
              Every field in this draft reverts to the platform&apos;s default appearance. Nothing goes live until you publish — you can still Undo or simply not publish.
            </p>
            <div className="mt-4 flex justify-end gap-2">
              <Button type="button" variant="ghost" onClick={() => setConfirmResetAllOpen(false)}>
                Cancel
              </Button>
              <Button type="button" variant="danger" onClick={handleResetAll}>
                Reset all
              </Button>
            </div>
          </div>
        </div>
      )}

      {confirmSaveOpen && (
        <div className="fixed inset-0 z-[80] flex items-center justify-center bg-black/70 p-4 backdrop-blur-sm">
          <div className="surface-panel-solid flex max-h-[85vh] w-full max-w-md flex-col p-5" role="dialog" aria-modal="true" aria-labelledby="publish-confirm-title">
            <p id="publish-confirm-title" className="text-sm font-semibold">Publish branding changes?</p>
            {changedTokens.length > 0 ? (
              <div className="mt-2 max-h-56 overflow-y-auto rounded-lg bg-white/[0.03] p-2.5">
                <p className="mb-1.5 text-[10px] font-semibold uppercase tracking-wide text-white/30">
                  {changedTokens.length} field{changedTokens.length === 1 ? "" : "s"} changed
                </p>
                <ul className="space-y-1.5">
                  {changedTokens.map((token) => (
                    <li key={token.id} className="flex items-center justify-between gap-2 text-xs">
                      <span className="text-white/60">{token.label}</span>
                      <span className="flex items-center gap-1.5 font-mono text-[11px]">
                        <span className="text-white/30 line-through">{displayValue(token, savedDraft[token.id])}</span>
                        <span className="text-white/25">→</span>
                        <span className="text-white/85">{displayValue(token, draft[token.id])}</span>
                      </span>
                    </li>
                  ))}
                </ul>
              </div>
            ) : (
              <p className="mt-2 text-xs text-white/45">No changes to publish.</p>
            )}
            <p className="mt-3 text-xs leading-5 text-white/45">This applies platform-wide immediately — every page reading platform branding will reflect it on next load. A snapshot is saved to Version History.</p>

            <label className="mt-3 flex flex-col gap-1.5">
              <span className="text-[11px] font-medium text-white/50">Version note (optional)</span>
              <textarea
                value={publishNote}
                onChange={(e) => setPublishNote(e.target.value)}
                placeholder="e.g. Refreshed primary color for the new season"
                rows={2}
                className="rounded-lg border border-white/[0.08] bg-white/[0.035] px-3 py-2 text-xs text-white placeholder:text-white/25 focus:border-brand-400/60 focus:outline-none"
              />
            </label>

            {saveError && <p className="mt-2 text-xs text-red-300">{saveError}</p>}
            <div className="mt-4 flex justify-end gap-2">
              <Button type="button" variant="ghost" onClick={() => setConfirmSaveOpen(false)} disabled={saving}>
                Cancel
              </Button>
              <Button type="button" variant="primary" onClick={handleConfirmSave} disabled={saving || changedTokens.length === 0}>
                {saving ? "Publishing…" : "Publish"}
              </Button>
            </div>
          </div>
        </div>
      )}

      {versionHistoryOpen && <VersionHistoryPanel onRestore={handleRestoreVersion} onClose={() => setVersionHistoryOpen(false)} />}
    </div>
  );
}
