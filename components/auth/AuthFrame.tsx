import { getPlatformBranding } from "@/lib/branding";
import { AuthFrameView } from "./AuthFrameView";

/**
 * Thin async Server Component wrapper — fetches platform branding, then
 * delegates rendering to AuthFrameView (components/auth/AuthFrameView.tsx).
 * Every existing caller of `import AuthFrame from ".../AuthFrame"` keeps
 * working with zero behavior change. Split into two files (Sprint 3,
 * White-Label Branding) because this file's `getPlatformBranding` import
 * pulls in lib/branding.ts's `import "server-only"` guard, which fails
 * the production build the instant ANY client component imports anything
 * from this file — even a different named export. AuthFrameView.tsx has
 * no such import, so the Brand Studio's "use client" live preview can
 * safely import PlatformHero/AuthFrameView from there instead.
 */
export default async function AuthFrame({
  eyebrow,
  title,
  description,
  children,
  backHref = "/",
}: {
  eyebrow: string;
  title: string;
  description: string;
  children: React.ReactNode;
  backHref?: string;
}) {
  // Platform tier only (Settings → Platform branding) — the unified login
  // has no competition context, so there's nothing to layer on top of it.
  const platform = await getPlatformBranding();
  return (
    <AuthFrameView platform={platform} eyebrow={eyebrow} title={title} description={description} backHref={backHref}>
      {children}
    </AuthFrameView>
  );
}
