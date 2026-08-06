/** Shared between LivePreview (the iframe host, in BrandStudio's own page)
 * and app/admin/brand-studio/preview (the iframe's own document) — kept in
 * one file so the two can never drift apart on tab ids or viewport widths. */

export type PreviewTab = "login" | "dashboard" | "broadcast" | "public" | "mobile";
export type Viewport = "desktop" | "tablet" | "mobile";

export const PREVIEW_TABS: { id: PreviewTab; label: string }[] = [
  { id: "login", label: "Login" },
  { id: "dashboard", label: "Admin Dashboard" },
  { id: "broadcast", label: "Broadcast Control Room" },
  { id: "public", label: "Public Website" },
  { id: "mobile", label: "Mobile" },
];

export const VIEWPORT_WIDTH: Record<Viewport, number> = {
  desktop: 1280,
  tablet: 768,
  mobile: 390,
};

/** The postMessage envelope LivePreview sends into the preview iframe. Origin-checked on both ends (see LivePreview.tsx and app/admin/brand-studio/preview/PreviewClient.tsx). */
export type PreviewSyncMessage =
  | { type: "ggsp-preview-ready" }
  | { type: "ggsp-draft-update"; draft: Record<string, string | number | boolean | null | undefined>; saved: unknown };
