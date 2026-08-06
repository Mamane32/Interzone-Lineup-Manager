"use client";

import { useMemo } from "react";
import { LogIn } from "lucide-react";
import ThemeScope from "@/components/branding/ThemeScope";
import { AuthFrameView, PlatformHero } from "@/components/auth/AuthFrameView";
import AdminShell from "@/components/shell/AdminShell";
import BroadcastHeader from "@/components/live/BroadcastHeader";
import Button from "@/components/ui/Button";
import Input from "@/components/ui/Input";
import type { BrandingConfiguration, PlatformBranding } from "@/lib/branding";
import type { LineupStatus, MatchLiveStatus } from "@/lib/types";
import type { ReadinessReport } from "@/lib/readiness";
import type { SystemState } from "@/components/live/ProductionStatusPanel";
import { draftToCssVars, draftToPlatformBranding, type BrandDraft } from "./draft-utils";

export type PreviewTab = "login" | "dashboard" | "broadcast" | "public" | "mobile";
export type Viewport = "desktop" | "tablet" | "mobile";

export const PREVIEW_TABS: { id: PreviewTab; label: string }[] = [
  { id: "login", label: "Login" },
  { id: "dashboard", label: "Admin Dashboard" },
  { id: "broadcast", label: "Broadcast Control Room" },
  { id: "public", label: "Public Website" },
  { id: "mobile", label: "Mobile" },
];

const VIEWPORT_WIDTH: Record<Viewport, number> = {
  desktop: 1280,
  tablet: 768,
  mobile: 390,
};

const FONT_STACKS: Record<string, string> = {
  Inter: "'Inter', system-ui, sans-serif",
  Oswald: "'Oswald', system-ui, sans-serif",
  Roboto: "'Roboto', system-ui, sans-serif",
  Poppins: "'Poppins', system-ui, sans-serif",
  "System UI": "system-ui, -apple-system, sans-serif",
};

const SHADOW_VALUES: Record<string, string> = {
  none: "none",
  soft: "0 12px 40px -18px rgba(0,0,0,0.55)",
  elevated: "0 24px 70px -20px rgba(0,0,0,0.7)",
  sharp: "0 8px 0 0 rgba(0,0,0,0.9)",
};

const SAMPLE_READINESS: ReadinessReport = {
  checks: [],
  scorePercent: 92,
  trackedCount: 12,
  passedCount: 11,
  matchdayStatus: "attention",
  canGoLive: true,
  blockingChecks: [],
};

const SAMPLE_VMIX_STATE: SystemState = "ready";
const SAMPLE_LINEUP_STATUS: LineupStatus = "submitted";
const SAMPLE_MATCH_STATUS: MatchLiveStatus = "first_half";

/**
 * Sample "logged in" identity shown in the Admin Dashboard / Mobile
 * preview tabs — not a real user, so AppShell's profile menu has
 * something plausible to render instead of blank fields.
 */
const SAMPLE_USER = { name: "Alex Morgan", email: "alex@example.com", role: "Super Administrator", avatarUrl: null as string | null };

/**
 * Contains any `position: fixed` descendant (AppShell's sidebar/header,
 * BroadcastHeader's sticky header) to this frame instead of letting it
 * escape to the real browser viewport — any CSS transform on an ancestor
 * becomes the containing block for `position: fixed` children, which is
 * exactly what's needed to preview real, unmodified production shell
 * components inside a bounded pane. `min-h-screen`/`100vh` inside real
 * components still measures against the actual window (vh units aren't
 * affected by this trick), so the frame scrolls vertically — acceptable
 * for a preview, and it keeps every rendered component 100% unmodified.
 *
 * Known limitation, intentionally not solved here: AppShell's
 * sidebar-vs-hamburger switch is driven by Tailwind's `lg:` viewport-
 * width breakpoint, which reads the real browser window's width, not
 * this frame's width — so narrowing the frame alone won't flip that
 * specific piece of chrome. Every token this Studio actually edits
 * (colors, logo, fonts, radius, shadow, spacing) still renders correctly
 * at any frame width. True per-frame responsive-breakpoint fidelity
 * would require an iframe-based preview architecture; flagged as a
 * follow-up rather than built now, consistent with not over-engineering
 * this phase.
 */
function DeviceFrame({ width, children }: { width: number; children: React.ReactNode }) {
  return (
    <div className="flex justify-center overflow-auto rounded-2xl border border-white/[0.08] bg-black/40 p-3">
      <div
        style={{ width, maxWidth: "100%", transform: "translateZ(0)" }}
        className="relative max-h-[720px] overflow-auto rounded-xl border border-white/[0.06] bg-surface-950 shadow-panel"
        // Neutralizes accidental navigation from real <Link>/<a> elements
        // rendered by the real components inside a preview pane — this is
        // a preview, not a live page, so a stray click should never leave
        // the Brand Studio.
        onClickCapture={(e) => {
          const target = e.target as HTMLElement;
          if (target.closest("a")) {
            e.preventDefault();
            e.stopPropagation();
          }
        }}
      >
        {children}
      </div>
    </div>
  );
}

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
  const branding = useMemo(() => draftToPlatformBranding(draft, saved), [draft, saved]);
  const cssVars = useMemo(() => draftToCssVars(draft), [draft]);

  const fontFamily = typeof draft.fontFamily === "string" ? FONT_STACKS[draft.fontFamily] ?? FONT_STACKS.Inter : FONT_STACKS.Inter;
  const shadowValue = typeof draft.shadowStyle === "string" ? SHADOW_VALUES[draft.shadowStyle] ?? SHADOW_VALUES.soft : SHADOW_VALUES.soft;
  const radiusPx = typeof draft.borderRadius === "number" ? draft.borderRadius : 16;

  const shellIdentity = { orgName: branding.organizationName, subtitle: branding.organizationSubtitle, logoUrl: branding.organizationLogoUrl };
  const heroIdentity = { organizationName: branding.organizationName, organizationSubtitle: branding.organizationSubtitle, organizationLogoUrl: branding.organizationLogoUrl };

  const broadcastBranding: BrandingConfiguration = {
    organizationName: branding.organizationName,
    organizationLogoUrl: branding.organizationLogoUrl,
    competitionName: "Sample Competition",
    competitionLogoUrl: null,
    seasonName: "2026 Season",
    productionPartnerName: null,
    productionPartnerLogoUrl: null,
    poweredByName: "GoodGrafik",
  };

  const width = VIEWPORT_WIDTH[viewport];

  return (
    <ThemeScope vars={cssVars} className="ggsp-preview-scope block h-full">
      {/* Scoped, preview-pane-only overrides for tokens that don't yet
         have a wired Tailwind class (font family, corner radius, shadow
         depth) — never touches anything outside .ggsp-preview-scope, so
         the real app's appearance is unaffected when no override is
         configured, exactly as required. The color tokens above don't
         need this: the six wired swatches (tailwind.config.ts) already
         read their CSS vars directly. */}
      <style>{`
        .ggsp-preview-scope { font-family: ${fontFamily}; }
        .ggsp-preview-scope .font-display,
        .ggsp-preview-scope .font-body { font-family: ${fontFamily} !important; }
        .ggsp-preview-scope [class*="rounded-xl"] { border-radius: ${radiusPx}px !important; }
        .ggsp-preview-scope [class*="shadow-glow"],
        .ggsp-preview-scope [class*="shadow-panel"] { box-shadow: ${shadowValue} !important; }
      `}</style>

      <DeviceFrame width={tab === "mobile" ? VIEWPORT_WIDTH.mobile : width}>
        {tab === "login" && (
          <AuthFrameView platform={heroIdentity} eyebrow="Welcome back" title="Sign in to your workspace" description="Enter your credentials to access the platform.">
            <form className="flex flex-col gap-4" onSubmit={(e) => e.preventDefault()}>
              <Input label="Email" type="email" placeholder="you@example.com" defaultValue="" />
              <Input label="Password" type="password" placeholder="••••••••" defaultValue="" />
              <Button type="submit" size="lg" className="mt-1 w-full">
                <LogIn size={16} /> Sign in
              </Button>
            </form>
          </AuthFrameView>
        )}

        {(tab === "dashboard" || tab === "mobile") && (
          <AdminShell user={SAMPLE_USER} branding={shellIdentity}>
            <SampleDashboardContent />
          </AdminShell>
        )}

        {tab === "broadcast" && (
          <BroadcastHeader
            branding={broadcastBranding}
            platform={shellIdentity}
            matchToken="preview-match"
            homeTeamName="Team A"
            awayTeamName="Team B"
            status={SAMPLE_MATCH_STATUS}
            round="Quarterfinal"
            homeLineupStatus={SAMPLE_LINEUP_STATUS}
            awayLineupStatus={SAMPLE_LINEUP_STATUS}
            vmixState={SAMPLE_VMIX_STATE}
            readiness={SAMPLE_READINESS}
          />
        )}

        {tab === "public" && (
          <div className="min-h-full bg-surface-950">
            <PlatformHero platform={heroIdentity} className="min-h-full" />
          </div>
        )}
      </DeviceFrame>
    </ThemeScope>
  );
}

/** Representative Admin Dashboard content — real Button/Input primitives and the app's real surface classes, standing in for one real dashboard page's worth of content so the preview shows how branding renders inside the shell, without depending on a live database read inside a client-side preview. */
function SampleDashboardContent() {
  return (
    <div className="space-y-6">
      <div>
        <p className="eyebrow">Overview</p>
        <h1 className="mt-2 font-display text-3xl font-semibold tracking-tight">Welcome back</h1>
      </div>
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
        {[
          ["Active Matches", "6"],
          ["Teams", "48"],
          ["Pending Lineups", "3"],
        ].map(([label, value]) => (
          <div key={label} className="surface-panel p-5">
            <p className="text-xs font-semibold uppercase tracking-wide text-white/35">{label}</p>
            <p className="mt-2 font-display text-3xl font-semibold">{value}</p>
          </div>
        ))}
      </div>
      <div className="surface-panel p-5">
        <p className="text-sm font-semibold text-white/80">Quick actions</p>
        <div className="mt-4 flex flex-wrap gap-3">
          <Button variant="primary">Create Match</Button>
          <Button variant="secondary">Invite User</Button>
          <Button variant="ghost">View Reports</Button>
        </div>
      </div>
    </div>
  );
}
