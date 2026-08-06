"use client";

import { useRef, useState } from "react";
import { Moon, Sun, Trash2, Upload, X } from "lucide-react";
import Button from "@/components/ui/Button";
import type { ThemeToken } from "@/lib/theme-tokens";
import { uploadPlatformBrandAsset, deletePlatformBrandAsset } from "@/app/admin/brand-studio/actions";
import ImageCropModal from "./ImageCropModal";

/**
 * Per-asset upload/replace/delete/crop workflow, opened from
 * ControlPanel's "Manage" button on any image token. A successful upload
 * updates the Brand Studio's draft state immediately (so the live
 * preview reflects it without Save) — the underlying file lands in
 * Supabase Storage right away (lib/image-upload.ts), but the
 * `platform_branding` row itself is only written when Save is confirmed,
 * matching "changes update the preview instantly; save persists only
 * after confirmation." Delete is the one immediate, already-confirmed
 * exception (see app/admin/brand-studio/actions.ts's deletePlatformBrandAsset
 * doc comment) — it also clears the DB column right away rather than
 * waiting for Save, since an admin who clicks Delete has already made an
 * unambiguous, confirmed decision.
 */
export default function AssetManager({
  token,
  currentUrl,
  mainLogoUrl,
  onClose,
  onChange,
}: {
  token: ThemeToken;
  currentUrl: string | null;
  mainLogoUrl: string | null;
  onClose: () => void;
  onChange: (url: string | null) => void;
}) {
  const [pendingFile, setPendingFile] = useState<File | null>(null);
  const [preview, setPreview] = useState<"dark" | "light" | "transparent">("dark");
  const [error, setError] = useState<string | null>(null);
  const [pending, setPending] = useState(false);
  const [confirmingDelete, setConfirmingDelete] = useState(false);
  const fileInputRef = useRef<HTMLInputElement | null>(null);

  const isMainLogo = token.id === "mainLogo";
  const effectiveUrl = currentUrl ?? (isMainLogo ? null : mainLogoUrl);
  const usingFallback = !currentUrl && !isMainLogo && Boolean(mainLogoUrl);

  function handleFileSelected(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (!file) return;
    if (!file.type.startsWith("image/")) {
      setError("Only image files are allowed.");
      return;
    }
    if (file.size > 5 * 1024 * 1024) {
      setError("Image must be smaller than 5MB.");
      return;
    }
    setError(null);
    setPendingFile(file);
    e.target.value = "";
  }

  async function handleCropApplied(blob: Blob) {
    setPendingFile(null);
    const file = new File([blob], `${token.id}.png`, { type: "image/png" });
    setPending(true);
    setError(null);
    try {
      const formData = new FormData();
      formData.append("file", file);
      const result = await uploadPlatformBrandAsset(token.id, formData);
      if (!result.ok) {
        setError(result.error);
        return;
      }
      onChange(result.url);
    } finally {
      setPending(false);
    }
  }

  async function handleDelete() {
    setPending(true);
    setError(null);
    try {
      const result = await deletePlatformBrandAsset(token.id, token.column);
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
      <div className="surface-panel-solid w-full max-w-sm p-5">
        <div className="mb-4 flex items-center justify-between">
          <div>
            <p className="text-sm font-semibold">{token.label}</p>
            {usingFallback && <p className="text-[11px] text-white/35">Not set — showing Main Logo fallback</p>}
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

        <div className="mt-3 flex h-32 items-center justify-center overflow-hidden rounded-xl border border-white/10" style={previewStyle}>
          {effectiveUrl ? (
            // eslint-disable-next-line @next/next/no-img-element
            <img src={effectiveUrl} alt="" className="max-h-full max-w-full object-contain p-4" />
          ) : (
            <span className="text-xs text-white/30">No image</span>
          )}
        </div>

        {error && <p className="mt-3 text-xs text-red-300">{error}</p>}

        <div className="mt-4 flex gap-2">
          <input ref={fileInputRef} type="file" accept="image/*" className="hidden" onChange={handleFileSelected} />
          <Button type="button" variant="secondary" className="flex-1" onClick={() => fileInputRef.current?.click()} disabled={pending}>
            <Upload size={14} /> {currentUrl ? "Replace" : "Upload"}
          </Button>
          {currentUrl && (
            <Button type="button" variant="danger" onClick={() => setConfirmingDelete(true)} disabled={pending}>
              <Trash2 size={14} />
            </Button>
          )}
        </div>

        {confirmingDelete && (
          <div className="mt-3 rounded-xl border border-red-400/25 bg-red-400/[0.06] p-3">
            <p className="text-xs text-red-200">
              Delete this file{isMainLogo ? "" : " — this variant will fall back to Main Logo"}? This removes the stored file immediately and cannot be undone from here.
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
