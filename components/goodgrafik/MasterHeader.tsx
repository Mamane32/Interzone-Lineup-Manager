"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import BrandMark from "@/components/brand/BrandMark";
import { WORLDS } from "./worlds";

/** Desktop/tablet top nav for the GoodGrafik master shell — the four worlds plus Home, active-highlighted by path. Hidden on small screens in favor of MasterBottomNav, the same split GGScoreLive already uses (top chrome on desktop, a fixed bottom bar on mobile) rather than cramming both into one responsive nav. */
export default function MasterHeader() {
  const pathname = usePathname();

  return (
    <header className="fixed inset-x-0 top-0 z-50 border-b border-white/[0.06] bg-surface-950/85 backdrop-blur-xl">
      <div className="mx-auto flex h-16 max-w-7xl items-center justify-between px-5 sm:px-8">
        <BrandMark subtitle="Platform" />
        <nav className="hidden items-center gap-1 md:flex" aria-label="GoodGrafik worlds">
          {WORLDS.map((world) => {
            const active = pathname === world.href || pathname.startsWith(`${world.href}/`);
            return (
              <Link
                key={world.id}
                href={world.href}
                className={`rounded-lg px-3.5 py-2 text-sm font-semibold transition ${
                  active ? "bg-white/[0.07] text-white" : "text-white/50 hover:text-white"
                }`}
              >
                {world.name}
              </Link>
            );
          })}
        </nav>
        <Link
          href="/login"
          className="hidden h-10 flex-none items-center gap-2 rounded-xl bg-brand-400 px-4 text-sm font-semibold text-surface-950 transition hover:bg-brand-100 sm:inline-flex"
        >
          Open workspace
        </Link>
      </div>
    </header>
  );
}
