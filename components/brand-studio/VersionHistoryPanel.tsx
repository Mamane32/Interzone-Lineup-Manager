"use client";

import { useEffect, useState } from "react";
import { History, RotateCcw, X } from "lucide-react";
import Button from "@/components/ui/Button";
import { useEscapeKey } from "@/lib/hooks";
import { listPlatformBrandingVersionsAction, restorePlatformBrandingVersion } from "@/app/admin/brand-studio/actions";
import type { PlatformBrandingVersion } from "@/lib/branding-versions";
import type { BrandDraft } from "./draft-utils";

function formatWhen(iso: string): string {
  const date = new Date(iso);
  const diffMs = Date.now() - date.getTime();
  const diffMin = Math.round(diffMs / 60000);
  if (diffMin < 1) return "just now";
  if (diffMin < 60) return `${diffMin}m ago`;
  const diffHr = Math.round(diffMin / 60);
  if (diffHr < 24) return `${diffHr}h ago`;
  const diffDay = Math.round(diffHr / 24);
  if (diffDay < 30) return `${diffDay}d ago`;
  return date.toLocaleDateString();
}

/**
 * Version History — every confirmed Publish (migration 032's
 * platform_branding_versions), most recent first. "Restore" loads that
 * version's complete snapshot back into the Studio's in-memory draft (via
 * the parent's onRestore) rather than writing it live directly — it then
 * goes through the exact same dirty/diff/Publish-confirmation flow as any
 * other edit, so a restore is reviewed before it takes effect, same as
 * everything else in the Studio.
 */
export default function VersionHistoryPanel({ onRestore, onClose }: { onRestore: (draft: BrandDraft) => void; onClose: () => void }) {
  const [versions, setVersions] = useState<PlatformBrandingVersion[] | null>(null);
  const [restoringId, setRestoringId] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  useEscapeKey(onClose);

  useEffect(() => {
    listPlatformBrandingVersionsAction().then(setVersions).catch(() => setVersions([]));
  }, []);

  async function handleRestore(id: string) {
    setRestoringId(id);
    setError(null);
    try {
      const result = await restorePlatformBrandingVersion(id);
      if (!result.ok) {
        setError(result.error);
        return;
      }
      onRestore(result.draft);
      onClose();
    } finally {
      setRestoringId(null);
    }
  }

  return (
    <div className="fixed inset-0 z-[80] flex items-center justify-center bg-black/70 p-4 backdrop-blur-sm">
      <div className="surface-panel-solid flex max-h-[80vh] w-full max-w-md flex-col p-5" role="dialog" aria-modal="true" aria-labelledby="version-history-title">
        <div className="mb-3 flex items-center justify-between">
          <p id="version-history-title" className="flex items-center gap-2 text-sm font-semibold">
            <History size={15} /> Version History
          </p>
          <button onClick={onClose} className="rounded-lg p-1.5 text-white/40 hover:bg-white/5 hover:text-white" aria-label="Close">
            <X size={16} />
          </button>
        </div>
        <p className="mb-3 text-[11px] leading-4 text-white/35">Every published version of the platform&apos;s branding. Restoring loads it back into your draft for review — nothing goes live until you publish again.</p>

        {error && <p className="mb-2 text-xs text-red-300">{error}</p>}

        <div className="flex-1 space-y-2 overflow-y-auto">
          {versions === null && <p className="py-6 text-center text-xs text-white/30">Loading…</p>}
          {versions?.length === 0 && <p className="py-6 text-center text-xs text-white/30">No published versions yet.</p>}
          {versions?.map((v, i) => (
            <div key={v.id} className="flex items-start justify-between gap-3 rounded-xl border border-white/[0.07] bg-white/[0.02] p-3">
              <div className="min-w-0">
                <div className="flex items-center gap-2">
                  <p className="text-xs font-semibold text-white/80">{formatWhen(v.publishedAt)}</p>
                  {i === 0 && <span className="rounded-full bg-emerald-400/15 px-1.5 py-0.5 text-[9px] font-semibold text-emerald-300">Current</span>}
                </div>
                <p className="mt-0.5 truncate text-[11px] text-white/40">{v.note || "No note"}</p>
              </div>
              {i !== 0 && (
                <Button
                  type="button"
                  variant="secondary"
                  size="md"
                  className="h-8 flex-none px-2.5 text-[11px]"
                  onClick={() => handleRestore(v.id)}
                  disabled={restoringId !== null}
                >
                  <RotateCcw size={11} /> {restoringId === v.id ? "Restoring…" : "Restore"}
                </Button>
              )}
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
