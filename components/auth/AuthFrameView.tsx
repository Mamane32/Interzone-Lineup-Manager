import Link from "next/link";
import { ArrowLeft, CheckCircle2, Globe2, ShieldCheck, Sparkles } from "lucide-react";
import BrandMark from "@/components/brand/BrandMark";

export type HeroIdentity = {
  organizationName: string;
  organizationSubtitle: string;
  organizationLogoUrl: string | null;
};

/**
 * The login page's left-column marketing hero — extracted, unchanged,
 * from AuthFrame (Sprint 3) so the Brand Studio's live preview can render
 * this exact real component for its "Public Website" tab, since this
 * codebase has no separate public marketing site: the login hero is the
 * platform's actual current public-facing surface. AuthFrameView still
 * renders its own copy of this markup inline (not by importing this
 * component) — see AuthFrameView's own comment for why this is a
 * deliberate, safety-first duplication rather than a shared subcomponent.
 *
 * Deliberately lives in its own file, separate from AuthFrame.tsx's
 * default export: that file's default export is an async Server
 * Component that imports lib/branding.ts, which starts with
 * `import "server-only"`. Next.js/webpack treats "server-only" as a
 * whole-module guard — any client-side import of AuthFrame.tsx, even of
 * a different named export like this one, fails the production build
 * with "You're importing a component that needs server-only." This file
 * has no server-only imports, so the Brand Studio's "use client"
 * LivePreview can safely import PlatformHero/AuthFrameView from here.
 */
export function PlatformHero({ platform, className = "" }: { platform: HeroIdentity; className?: string }) {
  return (
    <section className={`pitch-texture flex flex-col justify-between p-12 xl:p-16 ${className}`}>
      <BrandMark size="lg" orgName={platform.organizationName} subtitle={platform.organizationSubtitle} logoUrl={platform.organizationLogoUrl} />
      <div className="max-w-xl animate-fade-up">
        <p className="eyebrow">The operating system for football competitions</p>
        <h2 className="mt-5 text-balance font-display text-5xl font-semibold leading-[1.04] tracking-tight">
          From kickoff to final whistle, run every matchday from one command center.
        </h2>
        <p className="mt-6 max-w-lg text-base leading-7 text-white/50">
          Competitions, teams, lineups, access, and live broadcast production — the way federations, leagues, and clubs actually run matchday.
        </p>
        <div className="mt-10 grid grid-cols-3 gap-3">
          {[
            [ShieldCheck, "Secure", "Role-based access"],
            [Globe2, "Connected", "Every stakeholder"],
            [Sparkles, "Ready", "Built to evolve"],
          ].map(([Icon, label, detail]) => (
            <div key={String(label)} className="surface-subtle p-4">
              <Icon size={17} className="text-brand-400" />
              <p className="mt-3 text-sm font-semibold">{String(label)}</p>
              <p className="mt-1 text-xs text-white/35">{String(detail)}</p>
            </div>
          ))}
        </div>
      </div>
      <p className="flex items-center gap-2 text-xs text-white/30">
        <CheckCircle2 size={14} className="text-emerald-400" /> Enterprise foundation active
      </p>
    </section>
  );
}

export type AuthFrameViewProps = {
  platform: HeroIdentity;
  eyebrow: string;
  title: string;
  description: string;
  children: React.ReactNode;
  backHref?: string;
};

/**
 * Pure, non-async view for the unified login shell — the exact JSX
 * AuthFrame has always rendered, parameterized on `platform` instead of
 * fetching it internally. Extracted (Sprint 3, White-Label Branding) so
 * the Brand Studio's client-side live preview can render this same real
 * component fed by in-memory draft branding, which a "use client" file
 * cannot do with an async Server Component like AuthFrame's default
 * export. AuthFrame's default export is a thin Server Component wrapper
 * that fetches branding and delegates here — every existing caller of
 * `import AuthFrame from ".../AuthFrame"` keeps working with zero
 * behavior change. The hero section's markup is duplicated here rather
 * than delegating to PlatformHero above, on purpose: this file renders on
 * the real, production login page, and a shared-subcomponent refactor of
 * a page real users depend on carries more regression risk than a few
 * duplicated lines of static JSX — see the project's standing "solid
 * architecture over temporary fixes, but don't destabilize what already
 * works" guidance.
 */
export function AuthFrameView({ platform, eyebrow, title, description, children, backHref = "/" }: AuthFrameViewProps) {
  return (
    <main className="relative min-h-screen overflow-hidden bg-surface-950">
      <div className="pointer-events-none absolute inset-0">
        <div className="absolute -left-32 top-16 h-[28rem] w-[28rem] rounded-full bg-brand-500/[0.12] blur-3xl" />
        <div className="absolute right-[-12rem] top-[-10rem] h-[34rem] w-[34rem] rounded-full border border-white/[0.04]" />
        <div className="absolute bottom-[-14rem] left-1/3 h-[30rem] w-[30rem] rounded-full bg-emerald-500/[0.05] blur-3xl" />
        <div className="absolute inset-0 opacity-[0.03] [background-image:linear-gradient(rgba(255,255,255,.8)_1px,transparent_1px),linear-gradient(90deg,rgba(255,255,255,.8)_1px,transparent_1px)] [background-size:48px_48px]" />
      </div>

      <div className="relative mx-auto grid min-h-screen max-w-[1440px] lg:grid-cols-[1.05fr_.95fr]">
        <section className="pitch-texture hidden flex-col justify-between border-r border-white/[0.06] p-12 lg:flex xl:p-16">
          <BrandMark size="lg" orgName={platform.organizationName} subtitle={platform.organizationSubtitle} logoUrl={platform.organizationLogoUrl} />
          <div className="max-w-xl animate-fade-up">
            <p className="eyebrow">The operating system for football competitions</p>
            <h2 className="mt-5 text-balance font-display text-5xl font-semibold leading-[1.04] tracking-tight">
              From kickoff to final whistle, run every matchday from one command center.
            </h2>
            <p className="mt-6 max-w-lg text-base leading-7 text-white/50">
              Competitions, teams, lineups, access, and live broadcast production — the way federations, leagues, and clubs actually run matchday.
            </p>
            <div className="mt-10 grid grid-cols-3 gap-3">
              {[
                [ShieldCheck, "Secure", "Role-based access"],
                [Globe2, "Connected", "Every stakeholder"],
                [Sparkles, "Ready", "Built to evolve"],
              ].map(([Icon, label, detail]) => (
                <div key={String(label)} className="surface-subtle p-4">
                  <Icon size={17} className="text-brand-400" />
                  <p className="mt-3 text-sm font-semibold">{String(label)}</p>
                  <p className="mt-1 text-xs text-white/35">{String(detail)}</p>
                </div>
              ))}
            </div>
          </div>
          <p className="flex items-center gap-2 text-xs text-white/30">
            <CheckCircle2 size={14} className="text-emerald-400" /> Enterprise foundation active
          </p>
        </section>

        <section className="flex min-h-screen items-center justify-center px-5 py-10 sm:px-10 lg:px-14">
          <div className="w-full max-w-[440px]">
            <div className="mb-9 flex items-center justify-between lg:hidden">
              <BrandMark orgName={platform.organizationName} subtitle={platform.organizationSubtitle} logoUrl={platform.organizationLogoUrl} />
              <Link href={backHref} className="rounded-lg p-2 text-white/45 transition hover:bg-white/5 hover:text-white" aria-label="Go back">
                <ArrowLeft size={18} />
              </Link>
            </div>
            <Link href={backHref} className="mb-8 hidden w-fit items-center gap-2 text-sm text-white/40 transition hover:text-white lg:inline-flex">
              <ArrowLeft size={15} /> Back
            </Link>
            <p className="eyebrow">{eyebrow}</p>
            <h1 className="mt-3 text-balance font-display text-4xl font-semibold tracking-tight">{title}</h1>
            <p className="mt-3 text-sm leading-6 text-white/45">{description}</p>
            <div className="surface-panel mt-8 p-5 sm:p-7">{children}</div>
            <p className="mt-7 text-center text-[11px] uppercase tracking-[0.16em] text-white/20">
              Securely powered by <span className="text-white/40">GoodGrafik</span>
            </p>
          </div>
        </section>
      </div>
    </main>
  );
}
