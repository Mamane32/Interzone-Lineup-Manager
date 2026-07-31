"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { LayoutGrid, ClipboardList, Shirt, CalendarDays, User } from "lucide-react";
import type { Theme } from "@/lib/team-theme";

export default function BottomNav({ token, theme }: { token: string; theme?: Theme }) {
  const pathname = usePathname();

  const tabs = [
    { href: `/team/${token}/dashboard`, label: "Akèy", icon: LayoutGrid },
    { href: `/team/${token}/lineup`, label: "Lis Ekip", icon: ClipboardList },
    { href: `/team/${token}/formation`, label: "Fòmasyon", icon: Shirt },
    { href: `/team/${token}/calendar`, label: "Kalandriye", icon: CalendarDays },
    { href: `/team/${token}/profile`, label: "Pwofil", icon: User },
  ];

  return (
    <nav className="fixed inset-x-0 bottom-0 z-20 border-t border-black/5 bg-white/90 backdrop-blur-xl">
      <div className="mx-auto flex max-w-md items-stretch justify-around px-1 py-1.5">
        {tabs.map(({ href, label, icon: Icon }) => {
          const active = pathname === href;
          return (
            <Link
              key={href}
              href={href}
              className={`flex flex-1 flex-col items-center gap-1 rounded-xl py-2 text-[10.5px] font-medium transition-colors ${
                active ? `${theme?.chipBg ?? "bg-status-submitted/10"} ${theme?.chipText ?? "text-status-submitted"}` : "text-ink/40"
              }`}
            >
              <Icon size={19} strokeWidth={active ? 2.4 : 2} />
              {label}
            </Link>
          );
        })}
      </div>
    </nav>
  );
}
