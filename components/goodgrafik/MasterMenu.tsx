"use client";

import { useRef, useState } from "react";
import { createPortal } from "react-dom";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { Menu, X, Home, LogIn } from "lucide-react";
import { useDismissableLayer } from "@/lib/hooks";
import { ACCENT_CLASSES, WORLDS } from "./worlds";

/**
 * The GoodGrafik master shell's hamburger menu — a full-screen overlay
 * (same dismissal pattern as GGScoreLive's ScoresSearch: Escape key +
 * click-outside, via the shared lib/hooks.ts helpers) listing every real
 * Master Platform destination: Home, the four worlds, and the operator
 * login. This is what actually makes the hamburger useful on mobile,
 * where MasterHeader's desktop nav row is hidden.
 *
 * Rendered via a portal into document.body rather than in place: MasterHeader
 * (this component's actual DOM parent) has `backdrop-blur-xl`, and
 * backdrop-filter — like transform/filter/perspective — establishes a new
 * containing block for `position: fixed` descendants. Left in place, this
 * overlay's `fixed inset-0` would resolve against the header's own ~64px
 * box instead of the viewport, capping it to a thin strip instead of
 * covering the screen (caught visually, not just in code review — see the
 * commit this landed in).
 */
export default function MasterMenu() {
  const [open, setOpen] = useState(false);
  const pathname = usePathname();
  const panelRef = useRef<HTMLDivElement>(null);

  useDismissableLayer(panelRef as React.RefObject<HTMLElement>, () => setOpen(false), open);

  return (
    <>
      <button
        type="button"
        onClick={() => setOpen(true)}
        aria-label="Ouvri meni a"
        aria-expanded={open}
        className="flex h-10 w-10 flex-none items-center justify-center rounded-full border border-white/[0.08] text-white/70 transition hover:border-brand-400/40 hover:text-white"
      >
        <Menu size={18} />
      </button>

      {open &&
        createPortal(
          <div className="fixed inset-0 z-[90] flex bg-surface-950/95 backdrop-blur-xl" role="dialog" aria-modal="true" aria-label="Meni GoodGrafik">
          <div
            ref={panelRef}
            className="flex h-full w-full flex-col pb-[max(1.5rem,env(safe-area-inset-bottom))] pl-[max(1.25rem,env(safe-area-inset-left))] pr-[max(1.25rem,env(safe-area-inset-right))] pt-[max(1.25rem,env(safe-area-inset-top))] sm:max-w-sm"
          >
            <div className="flex items-center justify-between">
              <p className="font-display text-lg font-bold text-white">Meni</p>
              <button type="button" onClick={() => setOpen(false)} aria-label="Fèmen meni a" className="rounded-lg p-1.5 text-white/40 hover:bg-white/5 hover:text-white">
                <X size={20} />
              </button>
            </div>

            <nav className="mt-8 flex flex-col gap-1.5" aria-label="Platfòm Prensipal">
              <MenuLink href="/" active={pathname === "/"} onNavigate={() => setOpen(false)}>
                <Home size={18} className="text-brand-400" /> Home
              </MenuLink>
              {WORLDS.map((world) => {
                const accent = ACCENT_CLASSES[world.accent];
                const Icon = world.icon;
                const active = pathname === world.href || pathname.startsWith(`${world.href}/`);
                return (
                  <MenuLink key={world.id} href={world.href} active={active} onNavigate={() => setOpen(false)}>
                    <Icon size={18} className={accent.text} /> {world.name}
                  </MenuLink>
                );
              })}
            </nav>

            <div className="mt-auto border-t border-white/[0.08] pt-5">
              <MenuLink href="/login" active={false} onNavigate={() => setOpen(false)}>
                <LogIn size={18} className="text-white/50" /> Ouvri espas travay
              </MenuLink>
            </div>
          </div>
          </div>,
          document.body
        )}
    </>
  );
}

function MenuLink({
  href,
  active,
  onNavigate,
  children,
}: {
  href: string;
  active: boolean;
  onNavigate: () => void;
  children: React.ReactNode;
}) {
  return (
    <Link
      href={href}
      onClick={onNavigate}
      className={`flex items-center gap-3 rounded-xl px-4 py-3.5 text-base font-semibold transition ${
        active ? "bg-white/[0.07] text-white" : "text-white/60 hover:bg-white/[0.04] hover:text-white"
      }`}
    >
      {children}
    </Link>
  );
}
