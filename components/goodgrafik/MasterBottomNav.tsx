"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { Home } from "lucide-react";
import { WORLDS } from "./worlds";

/** Persistent bottom tab bar for the GoodGrafik master shell on mobile — Akèy (Home) plus the four worlds, same "fixed bottom bar" pattern GGScoreLive's PublicNav already established, kept as its own component since the master shell's tabs are a different set than GGScoreLive's own. Label is Kreyòl (Akèy), unlike GGScoreLive's own English "Home" label — the two are separate products with separate copy, so this doesn't touch that one. */
export default function MasterBottomNav() {
  const pathname = usePathname();
  const items = [{ id: "home", name: "Akèy", href: "/", icon: Home, accentText: "text-brand-400" }, ...WORLDS.map((w) => ({ id: w.id, name: w.name, href: w.href, icon: w.icon, accentText: ACCENT_TEXT[w.accent] }))];

  return (
    <nav className="fixed inset-x-0 bottom-0 z-50 border-t border-white/[0.08] bg-surface-950/95 pb-[env(safe-area-inset-bottom)] backdrop-blur-xl md:hidden">
      <div className="mx-auto flex max-w-2xl items-center justify-between py-2 pl-[max(0.375rem,env(safe-area-inset-left))] pr-[max(0.375rem,env(safe-area-inset-right))]">
        {items.map((item) => {
          const active = item.href === "/" ? pathname === "/" : pathname === item.href || pathname.startsWith(`${item.href}/`);
          const Icon = item.icon;
          return (
            <Link key={item.id} href={item.href} className="flex min-w-0 flex-1 flex-col items-center gap-1 px-0.5 py-1">
              <Icon size={19} className={active ? item.accentText : "text-white/45"} />
              <span className={`w-full truncate text-center text-[9px] font-semibold ${active ? item.accentText : "text-white/45"}`}>{item.name}</span>
            </Link>
          );
        })}
      </div>
    </nav>
  );
}

/** Same literal-class-name constraint as worlds.ts's ACCENT_CLASSES — kept local since this is the only place a bare `text-*` (no bg/border) variant is needed. */
const ACCENT_TEXT: Record<string, string> = {
  brand: "text-brand-400",
  violet: "text-violet-400",
  blue: "text-blue-400",
  rose: "text-rose-400",
};
