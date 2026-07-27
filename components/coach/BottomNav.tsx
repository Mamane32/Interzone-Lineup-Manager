"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { LayoutGrid, ClipboardList, CalendarDays, User } from "lucide-react";

export default function BottomNav({ token }: { token: string }) {
  const pathname = usePathname();

  const tabs = [
    { href: `/team/${token}/dashboard`, label: "Akèy", icon: LayoutGrid },
    { href: `/team/${token}/lineup`, label: "Lis Ekip", icon: ClipboardList },
    { href: `/team/${token}/calendar`, label: "Kalandriye", icon: CalendarDays },
    { href: `/team/${token}/profile`, label: "Pwofil", icon: User },
  ];

  return (
    <nav className="fixed inset-x-0 bottom-0 z-20 border-t border-black/5 bg-white/95 backdrop-blur">
      <div className="mx-auto flex max-w-md items-stretch justify-around">
        {tabs.map(({ href, label, icon: Icon }) => {
          const active = pathname === href;
          return (
            <Link
              key={href}
              href={href}
              className={`flex flex-1 flex-col items-center gap-1 py-2.5 text-[11px] font-medium transition-colors ${
                active ? "text-status-submitted" : "text-ink/40"
              }`}
            >
              <Icon size={20} strokeWidth={active ? 2.4 : 2} />
              {label}
            </Link>
          );
        })}
      </div>
    </nav>
  );
}
