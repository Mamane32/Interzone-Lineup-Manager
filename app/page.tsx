import Link from "next/link";
import {
  ArrowRight,
  BarChart3,
  Boxes,
  Building2,
  CheckCircle2,
  ChevronRight,
  CircleDot,
  GraduationCap,
  Radio,
  ShieldCheck,
  Trophy,
  Users2,
  Zap,
} from "lucide-react";
import BrandMark from "@/components/brand/BrandMark";

const capabilities = [
  { icon: Trophy, title: "Competition operations", body: "Structure competitions and coordinate every operational layer from one authoritative workspace." },
  { icon: Users2, title: "Teams & lineups", body: "Connect administrators and coaching staff with clear, controlled matchday workflows." },
  { icon: Radio, title: "Broadcast production", body: "Move from match data to live production with purpose-built control room experiences." },
  { icon: ShieldCheck, title: "Identity & access", body: "Give every stakeholder the right workspace with traceable, role-based access." },
];

const audiences = [
  [Building2, "Federations & leagues"],
  [Boxes, "Clubs & academies"],
  [GraduationCap, "Schools & universities"],
  [Radio, "Broadcasters & media"],
] as const;

export default function HomePage() {
  return (
    <main className="overflow-hidden bg-surface-950 text-white">
      <header className="fixed inset-x-0 top-0 z-50 border-b border-white/[0.06] bg-surface-950/80 backdrop-blur-xl">
        <div className="mx-auto flex h-20 max-w-7xl items-center justify-between px-5 sm:px-8">
          <BrandMark />
          <nav className="hidden items-center gap-7 text-sm text-white/50 md:flex" aria-label="Main navigation">
            <a href="#platform" className="transition hover:text-white">Platform</a>
            <a href="#capabilities" className="transition hover:text-white">Capabilities</a>
            <a href="#organizations" className="transition hover:text-white">Organizations</a>
          </nav>
          <Link href="/login" className="group inline-flex h-11 items-center gap-2 rounded-xl bg-brand-400 px-4 text-sm font-semibold text-surface-950 transition hover:bg-brand-100">
            Open platform <ArrowRight size={15} className="transition-transform group-hover:translate-x-0.5" />
          </Link>
        </div>
      </header>

      <section className="relative min-h-[900px] pt-20">
        <div className="pointer-events-none absolute inset-0">
          <div className="absolute left-1/2 top-20 h-[45rem] w-[45rem] -translate-x-1/2 rounded-full bg-brand-500/[0.075] blur-[120px]" />
          <div className="absolute inset-0 opacity-[0.035] [background-image:linear-gradient(rgba(255,255,255,.65)_1px,transparent_1px),linear-gradient(90deg,rgba(255,255,255,.65)_1px,transparent_1px)] [background-size:64px_64px]" />
        </div>
        <div className="relative mx-auto max-w-7xl px-5 pb-24 pt-24 text-center sm:px-8 sm:pt-32">
          <div className="mx-auto inline-flex items-center gap-2 rounded-full border border-brand-400/20 bg-brand-400/[0.07] px-3 py-1.5 text-xs font-medium text-brand-100">
            <CircleDot size={12} className="text-brand-400" /> The sports operating system
          </div>
          <h1 className="mx-auto mt-7 max-w-5xl text-balance font-display text-5xl font-semibold leading-[.98] tracking-[-0.035em] sm:text-7xl lg:text-[88px]">
            One command center for every game.
          </h1>
          <p className="mx-auto mt-7 max-w-2xl text-balance text-base leading-7 text-white/50 sm:text-lg">
            GGSP gives sports organizations one secure platform to organize competition, coordinate people, and power matchday—from registration to broadcast.
          </p>
          <div className="mt-9 flex flex-col items-center justify-center gap-3 sm:flex-row">
            <Link href="/login" className="group inline-flex h-14 w-full items-center justify-center gap-2 rounded-xl bg-brand-400 px-7 font-semibold text-surface-950 shadow-glow transition hover:bg-brand-100 sm:w-auto">
              Enter your workspace <ArrowRight size={17} className="transition-transform group-hover:translate-x-0.5" />
            </Link>
            <a href="#platform" className="inline-flex h-14 w-full items-center justify-center gap-2 rounded-xl border border-white/10 bg-white/[0.03] px-7 font-semibold text-white/70 transition hover:border-white/20 hover:text-white sm:w-auto">
              Explore the platform <ChevronRight size={17} />
            </a>
          </div>

          <div id="platform" className="relative mx-auto mt-20 max-w-6xl text-left">
            <div className="absolute -inset-6 rounded-[3rem] bg-brand-500/[0.035] blur-2xl" />
            <div className="surface-panel relative overflow-hidden rounded-3xl p-2 shadow-glow">
              <div className="flex h-11 items-center gap-2 border-b border-white/[0.06] px-4">
                <span className="h-2.5 w-2.5 rounded-full bg-red-400/70" />
                <span className="h-2.5 w-2.5 rounded-full bg-amber-300/70" />
                <span className="h-2.5 w-2.5 rounded-full bg-emerald-400/70" />
                <span className="ml-3 text-[10px] uppercase tracking-[.2em] text-white/25">Platform command center</span>
              </div>
              <div className="grid min-h-[390px] lg:grid-cols-[220px_1fr]">
                <div className="hidden border-r border-white/[0.06] p-5 lg:block">
                  <BrandMark compact />
                  <div className="mt-8 space-y-2">
                    {["Overview", "Competitions", "Teams", "Matchday", "Broadcast"].map((item, index) => (
                      <div key={item} className={`rounded-lg px-3 py-2.5 text-xs ${index === 0 ? "bg-brand-400 text-surface-950" : "text-white/35"}`}>
                        {item}
                      </div>
                    ))}
                  </div>
                </div>
                <div className="p-5 sm:p-7">
                  <div className="flex items-start justify-between">
                    <div>
                      <p className="eyebrow">Live operations</p>
                      <h2 className="mt-2 font-display text-2xl font-semibold">Good evening, operator.</h2>
                    </div>
                    <span className="rounded-full border border-emerald-400/20 bg-emerald-400/[0.07] px-3 py-1 text-[10px] font-semibold uppercase tracking-wider text-emerald-300">All systems ready</span>
                  </div>
                  <div className="mt-7 grid gap-3 sm:grid-cols-3">
                    {[
                      ["12", "Active competitions", Trophy],
                      ["48", "Teams connected", Users2],
                      ["06", "Matches today", Zap],
                    ].map(([value, label, Icon]) => (
                      <div key={String(label)} className="surface-subtle p-4">
                        <Icon size={17} className="text-brand-400" />
                        <p className="mt-5 font-display text-3xl font-semibold">{String(value)}</p>
                        <p className="mt-1 text-xs text-white/35">{String(label)}</p>
                      </div>
                    ))}
                  </div>
                  <div className="mt-3 grid gap-3 sm:grid-cols-[1.5fr_1fr]">
                    <div className="surface-subtle p-5">
                      <div className="flex items-center justify-between">
                        <p className="text-sm font-semibold">Matchday readiness</p>
                        <BarChart3 size={16} className="text-white/30" />
                      </div>
                      <div className="mt-7 flex h-24 items-end gap-2">
                        {[35, 56, 42, 74, 61, 86, 68, 92, 80, 100].map((height, index) => (
                          <span key={index} className="flex-1 rounded-t bg-brand-400/70" style={{ height: `${height}%`, opacity: .35 + index * .055 }} />
                        ))}
                      </div>
                    </div>
                    <div className="surface-subtle p-5">
                      <p className="text-sm font-semibold">Next live event</p>
                      <p className="mt-6 text-xs uppercase tracking-wider text-white/30">National League · Final</p>
                      <div className="mt-3 flex items-center justify-between font-display text-lg">
                        <span>North FC</span><span className="text-brand-400">20:00</span><span>Union</span>
                      </div>
                      <div className="mt-5 h-1.5 overflow-hidden rounded-full bg-white/5">
                        <div className="h-full w-[82%] rounded-full bg-emerald-400" />
                      </div>
                      <p className="mt-2 text-[10px] text-white/30">Production readiness · 82%</p>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </section>

      <section id="capabilities" className="border-y border-white/[0.06] bg-white/[0.015] py-24">
        <div className="mx-auto max-w-7xl px-5 sm:px-8">
          <div className="max-w-2xl">
            <p className="eyebrow">Built for the full operation</p>
            <h2 className="mt-4 text-balance font-display text-4xl font-semibold tracking-tight sm:text-5xl">The connective layer sports organizations have been missing.</h2>
          </div>
          <div className="mt-14 grid gap-px overflow-hidden rounded-2xl border border-white/[0.07] bg-white/[0.07] md:grid-cols-2 lg:grid-cols-4">
            {capabilities.map(({ icon: Icon, title, body }) => (
              <article key={title} className="bg-surface-950 p-7 transition hover:bg-surface-900">
                <span className="flex h-11 w-11 items-center justify-center rounded-xl border border-brand-400/15 bg-brand-400/[0.07] text-brand-400"><Icon size={20} /></span>
                <h3 className="mt-8 font-display text-xl font-semibold">{title}</h3>
                <p className="mt-3 text-sm leading-6 text-white/40">{body}</p>
              </article>
            ))}
          </div>
        </div>
      </section>

      <section id="organizations" className="py-24">
        <div className="mx-auto max-w-7xl px-5 sm:px-8">
          <div className="grid gap-12 lg:grid-cols-[.8fr_1.2fr] lg:items-center">
            <div>
              <p className="eyebrow">Designed to adapt</p>
              <h2 className="mt-4 text-balance font-display text-4xl font-semibold tracking-tight sm:text-5xl">Enterprise strength, without enterprise friction.</h2>
              <p className="mt-5 text-sm leading-7 text-white/45">A focused interface for every stakeholder, supported by one coherent platform underneath.</p>
              <ul className="mt-8 space-y-3 text-sm text-white/60">
                {["Role-aware workspaces", "Mobile-ready matchday workflows", "Permanent audit foundation", "One governed design system"].map((item) => (
                  <li key={item} className="flex items-center gap-3"><CheckCircle2 size={16} className="text-emerald-400" /> {item}</li>
                ))}
              </ul>
            </div>
            <div className="grid gap-3 sm:grid-cols-2">
              {audiences.map(([Icon, label], index) => (
                <div key={label} className="surface-panel group p-6 transition hover:-translate-y-1 hover:border-brand-400/20" style={{ animationDelay: `${index * 70}ms` }}>
                  <Icon size={21} className="text-brand-400" />
                  <p className="mt-7 font-display text-xl font-semibold">{label}</p>
                  <p className="mt-2 text-xs leading-5 text-white/35">A tailored entry point, consistent platform controls, and the context your team needs.</p>
                </div>
              ))}
            </div>
          </div>
        </div>
      </section>

      <section className="px-5 pb-24 sm:px-8">
        <div className="mx-auto max-w-7xl overflow-hidden rounded-3xl border border-brand-400/15 bg-brand-400 p-8 text-surface-950 sm:p-12">
          <div className="flex flex-col items-start justify-between gap-8 lg:flex-row lg:items-center">
            <div>
              <p className="text-xs font-semibold uppercase tracking-[.2em] opacity-60">Your operation, connected</p>
              <h2 className="mt-3 max-w-2xl text-balance font-display text-4xl font-semibold tracking-tight sm:text-5xl">Make every matchday feel under control.</h2>
            </div>
            <Link href="/login" className="inline-flex h-14 flex-none items-center gap-2 rounded-xl bg-surface-950 px-7 font-semibold text-white transition hover:bg-surface-850">
              Open GGSP <ArrowRight size={17} />
            </Link>
          </div>
        </div>
      </section>

      <footer className="border-t border-white/[0.06]">
        <div className="mx-auto flex max-w-7xl flex-col gap-6 px-5 py-9 sm:px-8 md:flex-row md:items-center md:justify-between">
          <BrandMark />
          <p className="text-xs text-white/25">© 2026 GoodGrafik. Built for the future of sport.</p>
        </div>
      </footer>
    </main>
  );
}
