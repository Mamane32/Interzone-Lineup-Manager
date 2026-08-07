import { ArrowDown, Flame } from "lucide-react";
import { WORLDS } from "@/components/goodgrafik/worlds";
import WorldCard from "@/components/goodgrafik/WorldCard";
import WorldQuickTile from "@/components/goodgrafik/WorldQuickTile";
import CrossPlatformCard from "@/components/goodgrafik/CrossPlatformCard";
import { getThisWeek, getTrendingNow } from "@/lib/goodgrafik-home";

export const dynamic = "force-dynamic";

export default async function GoodGrafikHomePage() {
  const [thisWeek, trending] = await Promise.all([getThisWeek(), getTrendingNow()]);

  return (
    <main className="overflow-hidden">
      <section className="relative px-5 pb-16 pt-14 sm:px-8 sm:pb-24 sm:pt-20">
        <div className="pointer-events-none absolute inset-0">
          <div className="absolute left-1/2 top-0 h-[38rem] w-[38rem] -translate-x-1/2 rounded-full bg-brand-500/[0.08] blur-[130px]" />
          <div className="absolute inset-0 opacity-[0.03] [background-image:linear-gradient(rgba(255,255,255,.65)_1px,transparent_1px),linear-gradient(90deg,rgba(255,255,255,.65)_1px,transparent_1px)] [background-size:64px_64px]" />
        </div>
        <div className="relative mx-auto max-w-5xl text-center">
          <p className="text-xs font-bold uppercase tracking-[0.3em] text-white/40">Byenveni nan</p>
          <h1 className="mx-auto mt-3 max-w-4xl text-balance font-display text-5xl font-black leading-[.98] tracking-tight sm:text-6xl lg:text-7xl">
            <span className="text-white">Good</span>
            <span className="text-brand-400">Grafik</span>
          </h1>
          <p className="mt-4 text-xs font-bold uppercase tracking-[0.3em] text-brand-400">Kreyatif · Medya · An Dirèk</p>
          <p className="mx-auto mt-6 max-w-xl text-balance text-base leading-7 text-white/50 sm:text-lg">
            Yon platfòm nimerik ki konekte espò, kilti, mizik, pwodiksyon ak enfòmasyon an dirèk.
          </p>
          <a
            href="#worlds"
            className="group mx-auto mt-9 inline-flex h-12 items-center gap-2 rounded-xl bg-brand-400 px-7 font-semibold text-surface-950 shadow-glow transition hover:bg-brand-100"
          >
            Dekouvri <ArrowDown size={16} className="transition-transform group-hover:translate-y-0.5" />
          </a>

          <div className="mx-auto mt-12 flex max-w-md items-start justify-between gap-2 sm:max-w-lg">
            {WORLDS.map((world, i) => (
              <WorldQuickTile key={world.id} world={world} index={i} />
            ))}
          </div>
        </div>
      </section>

      <section id="worlds" className="scroll-mt-20 px-5 sm:px-8">
        <div className="mx-auto grid max-w-6xl gap-4 sm:grid-cols-2">
          {WORLDS.map((world, i) => (
            <WorldCard key={world.id} world={world} index={i} />
          ))}
        </div>
      </section>

      <section className="mt-16 px-5 sm:px-8 sm:mt-24">
        <div className="mx-auto max-w-6xl">
          <div className="flex items-center gap-2 px-1">
            <h2 className="font-display text-xl font-bold tracking-tight sm:text-2xl">Semèn Sa a</h2>
          </div>
          <p className="mt-1.5 px-1 text-sm text-white/40">Nan tout mond yo, sa k ap pase semèn sa a.</p>
          <div className="-mx-5 mt-6 flex gap-3 overflow-x-auto px-5 pb-2 sm:mx-0 sm:px-0">
            {thisWeek.map((item, i) => (
              <CrossPlatformCard key={item.id} item={item} index={i} />
            ))}
          </div>
        </div>
      </section>

      <section className="mt-12 px-5 pb-20 sm:px-8 sm:pb-28">
        <div className="mx-auto max-w-6xl">
          <div className="flex items-center gap-2 px-1">
            <Flame size={18} className="text-brand-400" />
            <h2 className="font-display text-xl font-bold tracking-tight sm:text-2xl">Tandans Kounye a</h2>
          </div>
          <div className="-mx-5 mt-6 flex gap-3 overflow-x-auto px-5 pb-2 sm:mx-0 sm:px-0">
            {trending.map((item, i) => (
              <CrossPlatformCard key={item.id} item={item} index={i} />
            ))}
          </div>
        </div>
      </section>

      <footer className="border-t border-white/[0.06] px-5 py-9 sm:px-8">
        <div className="mx-auto flex max-w-6xl flex-col items-center gap-3 text-center sm:flex-row sm:justify-between sm:text-left">
          <p className="text-xs text-white/25">© 2026 GoodGrafik. Sports, Culture, News, Studio — yon sèl platfòm.</p>
        </div>
      </footer>
    </main>
  );
}
