import Link from "next/link";
import { ArrowLeft, CheckCircle2, Globe2, ShieldCheck, Sparkles } from "lucide-react";
import BrandMark from "@/components/brand/BrandMark";

export default function AuthFrame({
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
  return (
    <main className="relative min-h-screen overflow-hidden bg-surface-950">
      <div className="pointer-events-none absolute inset-0">
        <div className="absolute -left-32 top-16 h-96 w-96 rounded-full bg-brand-500/[0.08] blur-3xl" />
        <div className="absolute right-[-12rem] top-[-10rem] h-[34rem] w-[34rem] rounded-full border border-white/[0.04]" />
        <div className="absolute inset-0 opacity-[0.03] [background-image:linear-gradient(rgba(255,255,255,.8)_1px,transparent_1px),linear-gradient(90deg,rgba(255,255,255,.8)_1px,transparent_1px)] [background-size:48px_48px]" />
      </div>

      <div className="relative mx-auto grid min-h-screen max-w-[1440px] lg:grid-cols-[1.05fr_.95fr]">
        <section className="hidden flex-col justify-between border-r border-white/[0.06] p-12 lg:flex xl:p-16">
          <BrandMark />
          <div className="max-w-xl animate-fade-up">
            <p className="eyebrow">One platform. Every matchday.</p>
            <h2 className="mt-5 text-balance font-display text-5xl font-semibold leading-[1.04] tracking-tight">
              Run sport with clarity, speed, and confidence.
            </h2>
            <p className="mt-6 max-w-lg text-base leading-7 text-white/50">
              Competition operations, teams, lineups, access, and broadcast production—coordinated in one secure workspace.
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
              <BrandMark />
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
