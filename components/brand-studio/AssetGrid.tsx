"use client";

import { useEffect, useState } from "react";
import { Download, FileText, ImageOff, Settings2 } from "lucide-react";
import { LEVEL_1_BRAND_ASSET_TOKENS, type ThemeToken } from "@/lib/theme-tokens";
import type { BrandDraft } from "./draft-utils";

const CHECKERBOARD_STYLE: React.CSSProperties = {
  backgroundColor: "#fff",
  backgroundImage: "repeating-conic-gradient(#d9d9d9 0% 25%, transparent 0% 50%)",
  backgroundSize: "14px 14px",
};

/** Where each variant is actually consumed today — the same facts as each token's helperText (lib/theme-tokens.ts), restated as short chips so a glance at the card answers "where is this used" without reading prose. Empty array for every Reserved token, matching its helperText exactly. */
const ASSET_USAGE: Record<string, string[]> = {
  mainLogo: ["Sidebar", "Header", "Login screen", "Footer"],
};

function formatFromUrl(url: string): string {
  const clean = url.split("?")[0].split("#")[0];
  const ext = clean.split(".").pop();
  return ext && ext.length <= 4 ? ext.toUpperCase() : "FILE";
}

function formatBytes(bytes: number): string {
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(0)} KB`;
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
}

/** One logo/icon variant's live-preview card — replaces ControlPanel's generic image TokenField row for the "Logos & Assets" section, the same way ColorStudio replaces its generic grid for "Colors". A checkerboard backdrop (not a flat dark or light one) since every asset here is typically a transparent PNG and needs to read correctly against both themes at once. */
function AssetCard({ token, url, onManage }: { token: ThemeToken; url: string | null; onManage: () => void }) {
  const [dimensions, setDimensions] = useState<string | null>(null);
  const [sizeLabel, setSizeLabel] = useState<string | null>(null);
  const reserved = token.helperText?.startsWith("Reserved");
  const isPdf = url ? formatFromUrl(url) === "PDF" : false;
  const usage = ASSET_USAGE[token.id] ?? [];

  useEffect(() => {
    setDimensions(null);
    setSizeLabel(null);
    if (!url) return;
    let cancelled = false;
    // Best-effort only — Content-Length isn't guaranteed (some CDNs omit
    // it on HEAD), and a failed/opaque response should just leave the
    // size chip blank rather than showing an error for a non-essential
    // metadata field.
    fetch(url, { method: "HEAD" })
      .then((res) => {
        const len = res.headers.get("content-length");
        if (!cancelled && len) setSizeLabel(formatBytes(Number(len)));
      })
      .catch(() => {});
    return () => {
      cancelled = true;
    };
  }, [url]);

  return (
    <div className="flex flex-col overflow-hidden rounded-xl border border-white/[0.08] bg-white/[0.02]">
      <div className="flex h-28 items-center justify-center overflow-hidden border-b border-white/[0.06]" style={CHECKERBOARD_STYLE}>
        {url ? (
          isPdf ? (
            <span className="flex flex-col items-center gap-1 text-black/45">
              <FileText size={22} />
              <span className="text-[10px] font-medium">PDF</span>
            </span>
          ) : (
            // eslint-disable-next-line @next/next/no-img-element
            <img
              src={url}
              alt=""
              className="max-h-full max-w-full object-contain p-3"
              onLoad={(e) => setDimensions(`${e.currentTarget.naturalWidth}×${e.currentTarget.naturalHeight}`)}
            />
          )
        ) : (
          <ImageOff size={20} className="text-black/20" />
        )}
      </div>

      <div className="flex flex-1 flex-col gap-2 p-3">
        <div className="flex items-start justify-between gap-2">
          <p className="text-sm font-medium text-white/85">{token.label}</p>
          {reserved && (
            <span className="flex-none rounded-full bg-white/[0.06] px-2 py-0.5 text-[9px] font-semibold uppercase tracking-wide text-white/35" title={token.helperText}>
              Reserved
            </span>
          )}
        </div>
        {!reserved && token.helperText && <p className="text-[11px] leading-4 text-white/35">{token.helperText}</p>}

        {usage.length > 0 && (
          <div className="flex flex-wrap gap-1">
            {usage.map((place) => (
              <span key={place} className="rounded-full bg-brand-400/[0.08] px-2 py-0.5 text-[9px] font-medium text-brand-400/90">
                {place}
              </span>
            ))}
          </div>
        )}

        <div className="mt-auto flex items-center justify-between gap-2 pt-1">
          <span className="font-mono text-[10px] text-white/25">
            {url ? [formatFromUrl(url), dimensions, sizeLabel].filter(Boolean).join(" · ") : "Not set"}
          </span>
          <div className="flex items-center gap-1.5">
            {url && (
              <a
                href={url}
                download
                className="flex h-8 w-8 items-center justify-center rounded-lg border border-white/[0.08] text-white/45 transition hover:border-brand-400/40 hover:text-white"
                aria-label={`Download ${token.label}`}
                title="Download"
              >
                <Download size={13} />
              </a>
            )}
            <button
              type="button"
              onClick={onManage}
              className="flex h-8 items-center gap-1.5 rounded-lg border border-white/[0.08] px-2.5 text-[11px] font-semibold text-white/60 transition hover:border-brand-400/40 hover:text-white"
            >
              <Settings2 size={12} /> Manage
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}

/** "Logos & Assets" section body — a real card grid instead of ControlPanel's generic stacked-field list, so every variant's actual image (against a checkerboard, since these are almost always transparent PNGs), format/dimensions/size, usage, and live/reserved status are visible at a glance before opening Manage. */
export default function AssetGrid({ draft, onManageAsset }: { draft: BrandDraft; onManageAsset: (token: ThemeToken) => void }) {
  return (
    <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-3">
      {LEVEL_1_BRAND_ASSET_TOKENS.map((token) => (
        <AssetCard key={token.id} token={token} url={typeof draft[token.id] === "string" ? (draft[token.id] as string) : null} onManage={() => onManageAsset(token)} />
      ))}
    </div>
  );
}
