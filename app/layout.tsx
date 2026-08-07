import type { Metadata, Viewport } from "next";
import { Oswald, Inter } from "next/font/google";
import ThemeScope from "@/components/branding/ThemeScope";
import { getPlatformBranding, platformBrandingToCssVars } from "@/lib/branding";
import { componentStyleClassNames, motionToggleClassNames } from "@/lib/theme-tokens";
import "./globals.css";

const oswald = Oswald({
  subsets: ["latin"],
  weight: ["500", "600", "700"],
  variable: "--font-oswald",
  display: "swap",
});

const inter = Inter({
  subsets: ["latin"],
  variable: "--font-inter",
  display: "swap",
});

export const metadata: Metadata = {
  title: {
    default: "GoodGrafik — Sports, Culture, News, Studio",
    template: "%s · GoodGrafik",
  },
  description: "GoodGrafik is the platform for Sports, Culture, News and Studio — live football, music and culture, breaking stories, and original productions, in one place.",
};

// viewport-fit: "cover" lets fixed-position chrome (the GoodGrafik master
// header/bottom nav) read env(safe-area-inset-*) to clear the iPhone
// notch/Dynamic Island and home indicator — inert everywhere else, since
// nothing outside components/goodgrafik/* uses env(safe-area-inset-*)
// today, so no existing page's layout changes.
export const viewport: Viewport = {
  width: "device-width",
  initialScale: 1,
  viewportFit: "cover",
};

export default async function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  // The one place platform_branding's colors become real everywhere —
  // every page in the app renders inside this ThemeScope, so a color an
  // admin sets in Brand Studio takes effect on next load without touching
  // any individual page. Previously ThemeScope only wrapped Brand Studio's
  // own live preview, so every "live in preview" token was inert outside
  // the Studio itself; this is what actually makes it the platform's single
  // source of truth. Safe by construction: every wired Tailwind color
  // falls back to its original hardcoded value when a var isn't set, and
  // getPlatformBranding() itself falls back to DEFAULT_PLATFORM_BRANDING
  // on any read error — a bad branding row can never blank the app.
  const platform = await getPlatformBranding();
  const cssVars = platformBrandingToCssVars(platform);
  const platformValues = platform as unknown as Record<string, unknown>;
  const bodyClassName = [
    "min-h-screen bg-surface-950 text-white",
    platform.reducedMotion ? "ggsp-reduced-motion" : "",
    componentStyleClassNames(platformValues),
    motionToggleClassNames(platformValues),
  ]
    .filter(Boolean)
    .join(" ");

  return (
    <html
      lang="en"
      className={`${oswald.variable} ${inter.variable}`}
      style={{ scrollBehavior: platform.smoothScrollEnabled === false ? "auto" : "smooth" }}
      suppressHydrationWarning
    >
      <ThemeScope as="body" vars={cssVars} className={bodyClassName}>
        {children}
      </ThemeScope>
    </html>
  );
}
