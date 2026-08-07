"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import BrandMark from "@/components/brand/BrandMark";
import MasterMenu from "./MasterMenu";
import MasterSearch from "./MasterSearch";
import { WORLDS } from "./worlds";

/**
 * Top chrome for the GoodGrafik master shell. Two different layouts, not
 * one responsive compromise: mobile gets a hamburger (MasterMenu) + a
 * compact logo + search (MasterSearch), since MasterBottomNav already
 * owns primary navigation down there; desktop gets the full logo, an
 * inline world nav row, search, and the operator "Open workspace" entry
 * point, since there's no bottom nav to lean on at that width.
 *
 * Padded for `env(safe-area-inset-*)` (viewport-fit=cover set in
 * app/layout.tsx) so the notch/Dynamic Island never overlaps the
 * hamburger or search buttons on iPhone, and the left/right insets clear
 * the rounded corners in landscape.
 */
export default function MasterHeader() {
  const pathname = usePathname();

  return (
    <header className="fixed inset-x-0 top-0 z-50 border-b border-white/[0.06] bg-surface-950/85 pt-[env(safe-area-inset-top)] backdrop-blur-xl">
      <div className="relative mx-auto flex h-16 max-w-7xl items-center justify-between gap-3 pl-[max(1.25rem,env(safe-area-inset-left))] pr-[max(1.25rem,env(safe-area-inset-right))] sm:pl-8 sm:pr-8">
        <div className="flex items-center gap-3 md:hidden">
          <MasterMenu />
        </div>

        <div className="hidden md:block">
          <BrandMark subtitle="Platfòm" />
        </div>
        <div className="absolute left-1/2 -translate-x-1/2 md:hidden">
          <BrandMark subtitle="Platfòm" size="sm" />
        </div>

        <nav className="hidden items-center gap-1 md:flex" aria-label="Mond GoodGrafik yo">
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

        <div className="flex items-center gap-2">
          <MasterSearch />
          <Link
            href="/login"
            className="hidden h-10 flex-none items-center gap-2 rounded-xl bg-brand-400 px-4 text-sm font-semibold text-surface-950 transition hover:bg-brand-100 sm:inline-flex"
          >
            Ouvri espas travay
          </Link>
        </div>
      </div>
    </header>
  );
}
