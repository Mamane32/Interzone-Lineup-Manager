"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import { Check, Moon, Sun, X, ZoomIn } from "lucide-react";
import Button from "@/components/ui/Button";
import { useEscapeKey } from "@/lib/hooks";

const BOX_SIZE = 280;
const OUTPUT_SIZE = 512;

type Pos = { x: number; y: number };

/**
 * Hand-rolled Canvas API cropper — upload / crop / zoom / reposition, no
 * new npm dependency. The sandbox this branch is built from can't run
 * `npm install` to regenerate package-lock.json, and CI runs `npm ci`
 * (exact lockfile match required), so a library like react-easy-crop or
 * cropperjs was ruled out; this does the same job with plain pointer
 * events and a canvas at Apply time. Square-crop only (fits every Brand
 * Studio logo/icon variant); non-square assets like Splash Screen or
 * Competition Banner still upload fine, just without crop framing —
 * documented as a follow-up if a non-square crop UI is ever needed.
 */
export default function ImageCropModal({
  file,
  onCancel,
  onApply,
}: {
  file: File;
  onCancel: () => void;
  onApply: (blob: Blob) => void;
}) {
  const [imgEl, setImgEl] = useState<HTMLImageElement | null>(null);
  const [zoom, setZoom] = useState(1);
  const [pos, setPos] = useState<Pos>({ x: 0, y: 0 });
  const [preview, setPreview] = useState<"dark" | "light" | "transparent">("dark");
  const dragState = useRef<{ startPointer: Pos; startPos: Pos } | null>(null);
  const canvasRef = useRef<HTMLCanvasElement | null>(null);

  const objectUrl = useMemo(() => URL.createObjectURL(file), [file]);

  useEscapeKey(onCancel);

  useEffect(() => {
    const img = new Image();
    img.onload = () => setImgEl(img);
    img.src = objectUrl;
    return () => URL.revokeObjectURL(objectUrl);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [objectUrl]);

  const baseScale = imgEl ? Math.max(BOX_SIZE / imgEl.naturalWidth, BOX_SIZE / imgEl.naturalHeight) : 1;
  const displayScale = baseScale * zoom;
  const displayWidth = imgEl ? imgEl.naturalWidth * displayScale : BOX_SIZE;
  const displayHeight = imgEl ? imgEl.naturalHeight * displayScale : BOX_SIZE;

  // Center the image the first time it loads.
  useEffect(() => {
    if (!imgEl) return;
    setPos({ x: (BOX_SIZE - imgEl.naturalWidth * baseScale) / 2, y: (BOX_SIZE - imgEl.naturalHeight * baseScale) / 2 });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [imgEl]);

  function clamp(next: Pos, w: number, h: number): Pos {
    const minX = Math.min(0, BOX_SIZE - w);
    const minY = Math.min(0, BOX_SIZE - h);
    return { x: Math.max(minX, Math.min(0, next.x)), y: Math.max(minY, Math.min(0, next.y)) };
  }

  useEffect(() => {
    setPos((p) => clamp(p, displayWidth, displayHeight));
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [zoom]);

  function onPointerDown(e: React.PointerEvent<HTMLDivElement>) {
    (e.target as HTMLElement).setPointerCapture(e.pointerId);
    dragState.current = { startPointer: { x: e.clientX, y: e.clientY }, startPos: pos };
  }
  function onPointerMove(e: React.PointerEvent<HTMLDivElement>) {
    if (!dragState.current) return;
    const dx = e.clientX - dragState.current.startPointer.x;
    const dy = e.clientY - dragState.current.startPointer.y;
    setPos(clamp({ x: dragState.current.startPos.x + dx, y: dragState.current.startPos.y + dy }, displayWidth, displayHeight));
  }
  function onPointerUp() {
    dragState.current = null;
  }

  function handleApply() {
    if (!imgEl) return;
    const canvas = canvasRef.current ?? document.createElement("canvas");
    canvas.width = OUTPUT_SIZE;
    canvas.height = OUTPUT_SIZE;
    const ctx = canvas.getContext("2d");
    if (!ctx) return;
    const sx = -pos.x / displayScale;
    const sy = -pos.y / displayScale;
    const sSize = BOX_SIZE / displayScale;
    ctx.clearRect(0, 0, OUTPUT_SIZE, OUTPUT_SIZE);
    ctx.drawImage(imgEl, sx, sy, sSize, sSize, 0, 0, OUTPUT_SIZE, OUTPUT_SIZE);
    canvas.toBlob((blob) => {
      if (blob) onApply(blob);
    }, "image/png");
  }

  const previewBg = preview === "dark" ? "#0d1117" : preview === "light" ? "#ffffff" : undefined;
  const previewStyle: React.CSSProperties =
    preview === "transparent"
      ? {
          backgroundColor: "#fff",
          backgroundImage:
            "repeating-conic-gradient(#d9d9d9 0% 25%, transparent 0% 50%)",
          backgroundSize: "12px 12px",
        }
      : { backgroundColor: previewBg };

  return (
    <div className="fixed inset-0 z-[70] flex items-center justify-center bg-black/70 backdrop-blur-sm p-4">
      <div className="surface-panel-solid w-full max-w-md p-5">
        <div className="mb-4 flex items-center justify-between">
          <p className="text-sm font-semibold">Crop &amp; position</p>
          <button onClick={onCancel} className="rounded-lg p-1.5 text-white/40 hover:bg-white/5 hover:text-white" aria-label="Cancel">
            <X size={16} />
          </button>
        </div>

        <div
          className="relative mx-auto touch-none overflow-hidden rounded-xl border border-white/10 bg-black/40"
          style={{ width: BOX_SIZE, height: BOX_SIZE }}
          onPointerDown={onPointerDown}
          onPointerMove={onPointerMove}
          onPointerUp={onPointerUp}
        >
          {imgEl && (
            // eslint-disable-next-line @next/next/no-img-element
            <img
              src={objectUrl}
              alt=""
              draggable={false}
              style={{ position: "absolute", left: pos.x, top: pos.y, width: displayWidth, height: displayHeight, cursor: "grab" }}
            />
          )}
          <div className="pointer-events-none absolute inset-0 rounded-xl ring-1 ring-inset ring-white/15" />
        </div>

        <div className="mt-4 flex items-center gap-3">
          <ZoomIn size={15} className="text-white/40" />
          <input type="range" min={1} max={3} step={0.02} value={zoom} onChange={(e) => setZoom(Number(e.target.value))} className="w-full accent-brand-400" />
        </div>

        <div className="mt-4">
          <p className="mb-2 text-[11px] font-semibold uppercase tracking-wide text-white/35">Preview against</p>
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
                {mode === "transparent" && <span className="h-3 w-3 rounded-sm border border-white/30" style={{ backgroundImage: "repeating-conic-gradient(#999 0% 25%, transparent 0% 50%)", backgroundSize: "6px 6px" }} />}
                {mode[0].toUpperCase() + mode.slice(1)}
              </button>
            ))}
          </div>
          <div className="mt-2 flex h-16 w-16 items-center justify-center overflow-hidden rounded-lg border border-white/10" style={previewStyle}>
            {imgEl && (
              // eslint-disable-next-line @next/next/no-img-element
              <img
                src={objectUrl}
                alt=""
                style={{
                  width: "100%",
                  height: "100%",
                  objectFit: "cover",
                  objectPosition: `${(-pos.x / (displayWidth - BOX_SIZE || 1)) * 100}% ${(-pos.y / (displayHeight - BOX_SIZE || 1)) * 100}%`,
                }}
              />
            )}
          </div>
        </div>

        <canvas ref={canvasRef} className="hidden" aria-hidden="true" />

        <div className="mt-5 flex justify-end gap-2">
          <Button type="button" variant="secondary" onClick={onCancel}>
            Cancel
          </Button>
          <Button type="button" variant="primary" onClick={handleApply} disabled={!imgEl}>
            <Check size={15} /> Apply crop
          </Button>
        </div>
      </div>
    </div>
  );
}
