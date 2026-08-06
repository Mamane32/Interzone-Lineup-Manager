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
import type { PreviewTab } from "./preview-types";
import TypographySpecimen from "./TypographySpecimen";

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

/** Not a real user — just something plausible for AppShell's profile menu to render. */
const SAMPLE_USER = { name: "Alex Morgan", email: "alex@example.com", role: "Super Administrator", avatarUrl: null as string | null };

/**
 * The actual branded content for one preview tab — extracted out of
 * LivePreview so it can render in two places with identical output: (1)
 * inside app/brand-studio-preview — a real, separate document loaded in an
 * <iframe> by LivePreview.tsx, kept in sync purely via postMessage. Every
 * tab gets its own independent viewport this way, so AdminShell's
 * sidebar-vs-hamburger `lg:` breakpoint (and every other responsive class)
 * evaluates against the *frame's* actual width instead of the browser
 * window's — what fixes menus/cards clipping instead of reflowing in the
 * old fixed-width, non-iframe preview.
 */
export default function PreviewSurface({ draft, saved, tab }: { draft: BrandDraft; saved: PlatformBranding; tab: PreviewTab }) {
  const branding = useMemo(() => draftToPlatformBranding(draft, saved), [draft, saved]);
  const cssVars = useMemo(() => draftToCssVars(draft), [draft]);

  const fontFamily = typeof draft.fontFamily === "string" ? FONT_STACKS[draft.fontFamily] ?? FONT_STACKS.Inter : FONT_STACKS.Inter;
  const shadowValue = typeof draft.shadowStyle === "string" ? SHADOW_VALUES[draft.shadowStyle] ?? SHADOW_VALUES.soft : SHADOW_VALUES.soft;
  const radiusPx = typeof draft.borderRadius === "number" ? draft.borderRadius : 16;
  const letterSpacingEm = typeof draft.letterSpacing === "number" ? draft.letterSpacing : 0;
  const lineHeightValue = typeof draft.lineHeight === "number" ? draft.lineHeight : 1.6;
  const paragraphSpacingPx = typeof draft.paragraphSpacing === "number" ? draft.paragraphSpacing : 16;
  const textTransformValue = typeof draft.textTransform === "string" ? draft.textTransform : "none";

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

  return (
    <ThemeScope vars={cssVars} className="ggsp-preview-scope block min-h-full">
      {/* Scoped, preview-pane-only overrides for tokens that don't yet
         have a wired Tailwind class (font family, corner radius, shadow
         depth) — never touches anything outside .ggsp-preview-scope, so
         the real app's appearance is unaffected when no override is
         configured, exactly as required. The color tokens above don't
         need this: the six wired swatches (tailwind.config.ts) already
         read their CSS vars directly. */}
      <style>{`
        .ggsp-preview-scope { font-family: ${fontFamily}; letter-spacing: ${letterSpacingEm}em; line-height: ${lineHeightValue}; }
        .ggsp-preview-scope .font-display,
        .ggsp-preview-scope .font-body { font-family: ${fontFamily} !important; }
        .ggsp-preview-scope [class*="rounded-xl"] { border-radius: ${radiusPx}px !important; }
        .ggsp-preview-scope [class*="shadow-glow"],
        .ggsp-preview-scope [class*="shadow-panel"] { box-shadow: ${shadowValue} !important; }
        .ggsp-preview-scope p { margin-bottom: ${paragraphSpacingPx}px; }
        .ggsp-preview-scope .font-display { text-transform: ${textTransformValue}; }
      `}</style>

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

      {tab === "typography" && (
        <div className="min-h-full bg-surface-950 text-white">
          <TypographySpecimen draft={draft} />
        </div>
      )}
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
