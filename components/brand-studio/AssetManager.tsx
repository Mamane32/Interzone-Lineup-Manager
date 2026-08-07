"use client";

import { useRef, useState } from "react";
import { Download, FileText, Moon, Sun, Trash2, Upload, X } from "lucide-react";
import Button from "@/components/ui/Button";
import { useEscapeKey } from "@/lib/hooks";
import type { ThemeToken } from "@/lib/theme-tokens";
import type { ImageUploadResult } from "@/lib/image-upload";
import ImageCropModal from "./ImageCropModal";

const MAX_BYTES = 5 * 1024 * 1024;

function isPdfUrl(url: string | null): boolean {
  return Boolean(url?.toLowerCase().split("?")[0].endsWith(".pdf"));
}

/** Vector formats aren't square-cropped the way a raster logo is — cropping an SVG through the canvas pipeline would rasterize it, and there's no meaningful canvas render for a PDF at all. Both upload as-is, unlike PNG/JPEG/WEBP which go through ImageCropModal. */
function skipsCrop(file: File): boolean {
  return file.type === "image/svg+xml" || file.type === "application/pdf";
}

/**
 * Per-asset upload/replace/delete/crop workflow, opened from
 * ControlPanel's "Manage" button (Level 1) or CompetitionBrandStudio's
 * equivalent (Level 2) on any image token. Level-agnostic by design —
 * `onUpload`/`onDelete` are passed in by the caller, which is what lets
 * both Studios share this one component instead of Level 2 needing its
 * own copy. A successful upload updates the caller's draft state
 * immediately (so the live preview reflects it without Save) — the
 * underlying file lands in Supabase Storage right away, but the
 * database row itself is only written when Save is confirmed, matching
 * "changes update the preview instantly; save persists only after
 * confirmation." Delete is the one immediate, already-confirmed
 * exception (see either level's deleteXBrandAsset doc comment) — it also
 * clears the DB column right away rather than waiting for Save, since an
 * admin who clicks Delete has already made an unambiguous, confirmed
 * decision.
 */
export default function AssetManager({
  token,
  currentUrl,
  fallbackUrl,
  fallbackLabel,
  onClose,
  onChange,
  onUpload,
  onDelete,
}: {
  token: ThemeToken;
  currentUrl: string | null;
  /** What renders/is implied when this variant has no value of its own — Level 1's Main Logo fallback, or Level 2's inherited platform value. Null when this token has no fallback concept (e.g. Level 1's own Main Logo). */
  fallbackUrl: string | null;
  /** Name shown in the "falls back to X" messaging — "Main Logo" (Level 1) or "the platform default" (Level 2). */
  fallbackLabel: string;
  onClose: () => void;
  onChange: (url: string | null) => void;
  onUpload: (file: File) => Promise<ImageUploadResult>;
  onDelete: () => Promise<{ ok: true } | { ok: false; error: string }>;
}) {
  const [pendingFile, setPendingFile] = useState<File | null>(null);
  const [preview, setPreview] = useState<"dark" | "light" | "transparent">("dark");
  const [error, setError] = useState<string | null>(null);
  const [pending, setPending] = useState(false);
  const [confirmingDelete, setConfirmingDelete] = useState(false);
  const [dragOver, setDragOver] = useState(false);
  const fileInputRef = useRef<HTMLInputElement | null>(null);

  useEscapeKey(onClose);

  const hasFallback = Boolean(fallbackUrl);
  const effectiveUrl = currentUrl ?? fallbackUrl;
  const usingFallback = !currentUrl && hasFallback;
  const previewIsPdf = isPdfUrl(effectiveUrl);

  async function uploadDirect(file: File) {
    setPending(true);
    setError(null);
    try {
      const result = await onUpload(file);
      if (!result.ok) {
        setError(result.error);
        return;
      }
      onChange(result.url);
    } finally {
      setPending(false);
    }
  }

  function processFile(file: File) {
    if (!file.type.startsWith("image/") && file.type !== "application/pdf") {
      setError("Only image or PDF files are allowed.");
      return;
    }
    if (file.size > MAX_BYTES) {
      setError("File must be smaller than 5MB.");
      return;
    }
    setError(null);
    if (skipsCrop(file)) {
      void uploadDirect(file);
    } else {
      setPendingFile(file);
    }
  }

  function handleFileSelected(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (file) processFile(file);
    e.target.value = "";
  }

  function handleDrop(e: React.DragEvent<HTMLDivElement>) {
    e.preventDefault();
    setDragOver(false);
    const file = e.dataTransfer.files?.[0];
    if (file) processFile(file);
  }

  async function handleCropApplied(blob: Blob) {
    setPendingFile(null);
    await uploadDirect(new File([blob], `${token.id}.png`, { type: "image/png" }));
  }

  async function handleDelete() {
    setPending(true);
    setError(null);
    try {
      const result = await onDelete();
      if (!result.ok) {
        setError(result.error);
        return;
      }
      onChange(null);
      setConfirmingDelete(false);
    } finally {
      setPending(false);
    }
  }

  const previewStyle: React.CSSProperties =
    preview === "transparent"
      ? { backgroundColor: "#fff", backgroundImage: "repeating-conic-gradient(#d9d9d9 0% 25%, transparent 0% 50%)", backgroundSize: "14px 14px" }
      : { backgroundColor: preview === "dark" ? "#0d1117" : "#ffffff" };

  return (
    <div className="fixed inset-0 z-[60] flex items-center justify-center bg-black/70 p-4 backdrop-blur-sm">
      <div className="surface-panel-solid w-full max-w-sm p-5" role="dialog" aria-modal="true" aria-labelledby="asset-manager-title">
        <div className="mb-4 flex items-center justify-between">
          <div>
            <p id="asset-manager-title" className="text-sm font-semibold">{token.label}</p>
            {usingFallback && <p className="text-[11px] text-white/35">Not set — showing {fallbackLabel} fallback</p>}
          </div>
          <button onClick={onClose} className="rounded-lg p-1.5 text-white/40 hover:bg-white/5 hover:text-white" aria-label="Close">
            <X size={16} />
          </button>
        </div>

        <div className="flex items-center gap-2">
          {(["dark", "light", "transparent"] as const).map((mode) => (
            <button
              key={mode}
              type="button"
              onClick={() => setPreview(mode)}
              className={`flex items-center gap-1.5 rounded-lg border px-2.5 py-1.5 text-[11px] font-medium transition ${
                preview === mode ? "border-brand-400/60 text-white" : "border-white/[0.08] text-white/40 hover:text-white"
              }`}
            >
              {mode === "dark" && <Moon size={12} />}
              {mode === "light" && <Sun size={12} />}
              {mode === "transparent" && (
                <span className="h-3 w-3 rounded-sm border border-white/30" style={{ backgroundImage: "repeating-conic-gradient(#999 0% 25%, transparent 0% 50%)", backgroundSize: "6px 6px" }} />
              )}
              {mode[0].toUpperCase() + mode.slice(1)}
            </button>
          ))}
        </div>

        {/* Doubles as the drag & drop target — dropping a file here replaces the asset directly, same validation/crop-routing as the file picker. */}
        <div
          onDragOver={(e) => {
            e.preventDefault();
            setDragOver(true);
          }}
          onDragLeave={() => setDragOver(false)}
          onDrop={handleDrop}
          className={`relative mt-3 flex h-32 items-center justify-center overflow-hidden rounded-xl border transition ${dragOver ? "border-brand-400/60" : "border-white/10"}`}
          style={previewStyle}
        >
          {effectiveUrl ? (
            previewIsPdf ? (
              <span className="flex flex-col items-center gap-1.5 text-black/50">
                <FileText size={26} />
                <span className="text-[11px] font-medium">PDF file</span>
              </span>
            ) : (
              // eslint-disable-next-line @next/next/no-img-element
              <img src={effectiveUrl} alt="" className="max-h-full max-w-full object-contain p-4" />
            )
          ) : (
            <span className="text-xs text-white/30">No image</span>
          )}
          {dragOver && (
            <div className="pointer-events-none absolute inset-0 flex items-center justify-center bg-brand-400/10 text-xs font-semibold text-brand-400">Drop to upload</div>
          )}
        </div>

        {error && <p className="mt-3 text-xs text-red-300">{error}</p>}

        <div className="mt-4 flex gap-2">
          <input ref={fileInputRef} type="file" accept="image/*,.pdf,application/pdf" className="hidden" onChange={handleFileSelected} />
          <Button type="button" variant="secondary" className="flex-1" onClick={() => fileInputRef.current?.click()} disabled={pending}>
            <Upload size={14} /> {currentUrl ? "Replace" : "Upload"}
          </Button>
          {currentUrl && (
            <a
              href={currentUrl}
              download
              className="flex h-11 w-11 flex-none items-center justify-center rounded-xl border border-white/[0.1] text-white/70 transition hover:bg-white/[0.07]"
              aria-label="Download"
              title="Download"
            >
              <Download size={14} />
            </a>
          )}
          {currentUrl && (
            <Button type="button" variant="danger" onClick={() => setConfirmingDelete(true)} disabled={pending}>
              <Trash2 size={14} />
            </Button>
          )}
        </div>
        <p className="mt-2 text-[10px] text-white/25">PNG, JPEG, WEBP, SVG, or PDF · up to 5MB. Drag a file onto the preview above, or use Upload.</p>

        {confirmingDelete && (
          <div className="mt-3 rounded-xl border border-red-400/25 bg-red-400/[0.06] p-3">
            <p className="text-xs text-red-200">
              Delete this file{hasFallback ? ` — this variant will fall back to ${fallbackLabel}` : ""}? This removes the stored file immediately and cannot be undone from here.
            </p>
            <div className="mt-2 flex justify-end gap-2">
              <Button type="button" variant="ghost" size="md" className="h-8 px-3 text-xs" onClick={() => setConfirmingDelete(false)}>
                Cancel
              </Button>
              <Button type="button" variant="danger" size="md" className="h-8 px-3 text-xs" onClick={handleDelete} disabled={pending}>
                Delete
              </Button>
            </div>
          </div>
        )}
      </div>

      {pendingFile && <ImageCropModal file={pendingFile} onCancel={() => setPendingFile(null)} onApply={handleCropApplied} />}
    </div>
  );
}
