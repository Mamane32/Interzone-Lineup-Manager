import Link from "next/link";

/**
 * A permanent, intentional path back to the GoodGrafik Master Platform
 * from every GGScoreLive/Sports page — GGScoreLive keeps its own complete
 * header + PublicNav bottom bar by design (stacking MasterHeader/
 * MasterBottomNav on top would double up on chrome for the same page), so
 * this is the one small addition each existing header gets instead: a
 * real, always-visible link to "/" that never depends on the browser Back
 * button. Framed as a breadcrumb, not a bare logo, so Sports reads as one
 * world *inside* GoodGrafik rather than a separate app you've navigated
 * away into — "GoodGrafik / Sports", not just a way out.
 */
export default function GoodGrafikBreadcrumb({ world = "Sports" }: { world?: string }) {
  return (
    <div className="flex items-center gap-1.5">
      <Link href="/" className="group flex items-center gap-1.5 text-[10px] font-bold uppercase tracking-wide text-white/35 transition hover:text-brand-400">
        <span
          className="relative flex h-3.5 w-3.5 flex-none items-center justify-center bg-gradient-to-b from-brand-100 via-brand-400 to-brand-600 text-surface-950 transition-transform group-hover:scale-110"
          style={{ clipPath: "polygon(0% 0%, 100% 0%, 100% 60%, 50% 100%, 0% 60%)" }}
        >
          <span className="text-[5px] font-display font-black leading-none tracking-[-0.06em]">GG</span>
        </span>
        GoodGrafik
      </Link>
      <span className="text-[10px] text-white/15">/</span>
      <span className="text-[10px] font-bold uppercase tracking-wide text-white/55">{world}</span>
    </div>
  );
}
