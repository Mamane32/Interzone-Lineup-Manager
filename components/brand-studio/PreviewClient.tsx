"use client";

import { useEffect, useState } from "react";
import type { PlatformBranding } from "@/lib/branding";
import { draftFromPlatformBranding, type BrandDraft } from "./draft-utils";
import PreviewSurface from "./PreviewSurface";
import type { PreviewTab, PreviewSyncMessage } from "./preview-types";

/**
 * The preview iframe's own document (app/brand-studio-preview/page.tsx
 * renders this). Starts from the real saved branding (server-fetched, so
 * there's never a blank flash) and then stays in sync with the Brand
 * Studio's in-memory draft purely via postMessage — this document has no
 * other connection to the parent window, by design: same-origin only,
 * every message's `origin` is checked before it's trusted.
 */
export default function PreviewClient({ initialSaved, tab }: { initialSaved: PlatformBranding; tab: PreviewTab }) {
  const [draft, setDraft] = useState<BrandDraft>(() => draftFromPlatformBranding(initialSaved));
  const [saved, setSaved] = useState<PlatformBranding>(initialSaved);

  useEffect(() => {
    function handleMessage(event: MessageEvent) {
      if (event.origin !== window.location.origin) return;
      if (event.source !== window.parent) return;
      const data = event.data as PreviewSyncMessage;
      if (data?.type === "ggsp-draft-update") {
        setDraft(data.draft);
        setSaved(data.saved as PlatformBranding);
      }
    }
    window.addEventListener("message", handleMessage);
    window.parent.postMessage({ type: "ggsp-preview-ready" } satisfies PreviewSyncMessage, window.location.origin);
    return () => window.removeEventListener("message", handleMessage);
  }, []);

  return <PreviewSurface draft={draft} saved={saved} tab={tab} />;
}
