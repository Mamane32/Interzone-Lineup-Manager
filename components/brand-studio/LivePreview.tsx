"use client";

import { useEffect, useRef } from "react";
import type { PlatformBranding } from "@/lib/branding";
import type { BrandDraft } from "./draft-utils";
import { PREVIEW_TABS, VIEWPORT_WIDTH, type PreviewTab, type Viewport, type PreviewSyncMessage } from "./preview-types";

export { PREVIEW_TABS };
export type { PreviewTab, Viewport };

/**
 * Hosts app/brand-studio-preview (a real, separate document) in an
 * <iframe> and keeps it in sync with the current draft purely via
 * postMessage — see that route's doc comment for why it has to be a
 * genuinely separate document rather than a component rendered inline
 * here (short version: an iframe gets its own viewport, which is what
 * lets AdminShell's responsive breakpoints react to the preview's actual
 * width instead of the browser window's).
 */
export default function LivePreview({
  draft,
  saved,
  tab,
  viewport,
}: {
  draft: BrandDraft;
  saved: PlatformBranding;
  tab: PreviewTab;
  viewport: Viewport;
}) {
  const iframeRef = useRef<HTMLIFrameElement>(null);
  const readyRef = useRef(false);
  // Always holds the latest draft/saved so the message-listener effect
  // below (installed once) never sends a stale snapshot from whichever
  // render it happened to close over.
  const latestRef = useRef({ draft, saved });
  latestRef.current = { draft, saved };

  function sendDraft() {
    iframeRef.current?.contentWindow?.postMessage(
      { type: "ggsp-draft-update", draft: latestRef.current.draft, saved: latestRef.current.saved } satisfies PreviewSyncMessage,
      window.location.origin
    );
  }

  useEffect(() => {
    function handleMessage(event: MessageEvent) {
      if (event.origin !== window.location.origin) return;
      if (event.source !== iframeRef.current?.contentWindow) return;
      const data = event.data as PreviewSyncMessage;
      if (data?.type === "ggsp-preview-ready") {
        readyRef.current = true;
        sendDraft();
      }
    }
    window.addEventListener("message", handleMessage);
    return () => window.removeEventListener("message", handleMessage);
  }, []);

  useEffect(() => {
    readyRef.current = false; // the iframe is remounting for a new tab (key change below) — wait for its fresh "ready" ping
  }, [tab]);

  useEffect(() => {
    if (readyRef.current) sendDraft();
  }, [draft, saved]);

  const width = tab === "mobile" ? VIEWPORT_WIDTH.mobile : VIEWPORT_WIDTH[viewport];

  return (
    <div className="flex justify-center overflow-auto rounded-2xl border border-white/[0.08] bg-black/40 p-3">
      <iframe
        key={tab}
        ref={iframeRef}
        src={`/brand-studio-preview?tab=${tab}`}
        title="Brand Studio live preview"
        style={{ width, maxWidth: "100%" }}
        className="max-h-[720px] min-h-[720px] rounded-xl border border-white/[0.06] bg-surface-950 shadow-panel"
      />
    </div>
  );
}
