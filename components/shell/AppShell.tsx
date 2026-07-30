"use client";

import { useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import {
  Bell,
  ChevronDown,
  ChevronRight,
  CircleHelp,
  LogOut,
  Menu,
  Search,
  Settings,
  ShieldCheck,
  UserRound,
  X,
  type LucideIcon,
} from "lucide-react";
import BrandMark from "@/components/brand/BrandMark";
import { unifiedSignOut } from "@/app/login/actions";

export type ShellNavItem = {
  href: string;
  label: string;
  icon: LucideIcon;
};

export type ShellNavGroup = {
  label: string;
  items: ShellNavItem[];
};

function initials(name: string) {
  return name
    .split(/\s+/)
    .filter(Boolean)
    .slice(0, 2)
    .map((part) => part[0]?.toUpperCase())
    .join("") || "GG";
}

export default function AppShell({
  children,
  nav,
  user,
  workspaceLabel,
}: {
  children: React.ReactNode;
  nav: ShellNavGroup[];
  user: { name: string; email: string; role: string };
  workspaceLabel: string;
}) {
  const pathname = usePathname();
  const [mobileOpen, setMobileOpen] = useState(false);
  const [notificationsOpen, setNotificationsOpen] = useState(false);
  const [profileOpen, setProfileOpen] = useState(false);

  useEffect(() => setMobileOpen(false), [pathname]);

  const breadcrumbs = useMemo(() => {
    const parts = pathname.split("/").filter(Boolean);
    return parts.map((part, index) => ({
      label: part.replace(/-/g, " ").replace(/\b\w/g, (letter) => letter.toUpperCase()),
      href:
        index === 0 && part === "admin"
          ? "/admin/dashboard"
          : `/${parts.slice(0, index + 1).join("/")}`,
    }));
  }, [pathname]);

  const sidebar = (
    <aside className="flex h-full flex-col bg-surface-900">
      <div className="flex h-20 items-center justify-between border-b border-white/[0.06] px-5">
        <BrandMark href="/admin/dashboard" />
        <button onClick={() => setMobileOpen(false)} className="rounded-lg p-2 text-white/40 hover:bg-white/5 hover:text-white lg:hidden" aria-label="Close navigation">
          <X size={19} />
        </button>
      </div>
      <div className="border-b border-white/[0.06] px-5 py-4">
        <p className="text-[10px] font-semibold uppercase tracking-[.18em] text-white/25">Current workspace</p>
        <div className="mt-2 flex items-center gap-3">
          <span className="flex h-9 w-9 items-center justify-center rounded-lg border border-brand-400/15 bg-brand-400/[0.07] text-brand-400">
            <ShieldCheck size={17} />
          </span>
          <div className="min-w-0">
            <p className="truncate text-sm font-semibold">{workspaceLabel}</p>
            <p className="truncate text-[11px] text-white/35">{user.role}</p>
          </div>
        </div>
      </div>
      <nav className="flex-1 overflow-y-auto px-3 py-5" aria-label="Workspace navigation">
        {nav.map((group) => (
          <div key={group.label} className="mb-6">
            <p className="mb-2 px-3 text-[10px] font-semibold uppercase tracking-[.18em] text-white/25">{group.label}</p>
            <div className="space-y-1">
              {group.items.map(({ href, label, icon: Icon }) => {
                const active = pathname === href || (href !== "/admin/dashboard" && pathname.startsWith(`${href}/`));
                return (
                  <Link key={href} href={href} aria-current={active ? "page" : undefined} className={`group flex items-center gap-3 rounded-xl px-3 py-2.5 text-sm transition ${active ? "bg-brand-400 text-surface-950 shadow-glow" : "text-white/45 hover:bg-white/[0.045] hover:text-white"}`}>
                    <Icon size={17} aria-hidden="true" />
                    <span className="flex-1">{label}</span>
                    {active && <ChevronRight size={14} />}
                  </Link>
                );
              })}
            </div>
          </div>
        ))}
      </nav>
      <div className="border-t border-white/[0.06] p-3">
        <Link href="/admin/settings" className="flex items-center gap-3 rounded-xl px-3 py-2.5 text-sm text-white/40 transition hover:bg-white/[0.045] hover:text-white">
          <CircleHelp size={17} /> Help & resources
        </Link>
      </div>
    </aside>
  );

  return (
    <div className="min-h-screen bg-surface-950 text-white lg:pl-[272px]">
      <div className="fixed inset-y-0 left-0 z-40 hidden w-[272px] border-r border-white/[0.06] lg:block">{sidebar}</div>
      {mobileOpen && (
        <div className="fixed inset-0 z-50 lg:hidden">
          <button className="absolute inset-0 bg-black/70 backdrop-blur-sm" onClick={() => setMobileOpen(false)} aria-label="Close navigation overlay" />
          <div className="relative h-full w-[min(88vw,320px)] border-r border-white/[0.08] shadow-2xl">{sidebar}</div>
        </div>
      )}

      <header className="sticky top-0 z-30 border-b border-white/[0.06] bg-surface-950/85 backdrop-blur-xl">
        <div className="flex h-20 items-center gap-3 px-4 sm:px-6 lg:px-8">
          <button onClick={() => setMobileOpen(true)} className="rounded-xl border border-white/[0.07] p-2.5 text-white/55 hover:bg-white/5 hover:text-white lg:hidden" aria-label="Open navigation">
            <Menu size={19} />
          </button>
          <div className="hidden min-w-0 flex-1 items-center gap-2 text-xs sm:flex">
            <Link href="/admin/dashboard" className="text-white/30 transition hover:text-white">GGSP</Link>
            {breadcrumbs.map((item, index) => (
              <span key={`${item.href}-${index}`} className="flex min-w-0 items-center gap-2">
                <ChevronRight size={12} className="text-white/15" />
                <Link href={item.href} className={`truncate ${index === breadcrumbs.length - 1 ? "font-medium text-white/70" : "text-white/30 hover:text-white"}`}>{item.label}</Link>
              </span>
            ))}
          </div>
          <button className="ml-auto hidden h-10 w-full max-w-xs items-center gap-2 rounded-xl border border-white/[0.07] bg-white/[0.025] px-3 text-left text-xs text-white/25 transition hover:border-white/15 sm:flex" aria-label="Search platform">
            <Search size={15} /> Search platform <kbd className="ml-auto rounded border border-white/10 px-1.5 py-0.5 text-[9px]">⌘K</kbd>
          </button>
          <div className="relative">
            <button onClick={() => { setNotificationsOpen((value) => !value); setProfileOpen(false); }} className="relative flex h-10 w-10 items-center justify-center rounded-xl border border-white/[0.07] text-white/50 transition hover:bg-white/5 hover:text-white" aria-label="Notifications" aria-expanded={notificationsOpen}>
              <Bell size={18} />
              <span className="absolute right-2 top-2 h-1.5 w-1.5 rounded-full bg-brand-400 ring-2 ring-surface-950" />
            </button>
            {notificationsOpen && (
              <div className="surface-panel absolute right-0 top-12 w-[min(88vw,360px)] overflow-hidden p-0">
                <div className="flex items-center justify-between border-b border-white/[0.06] px-4 py-3">
                  <p className="text-sm font-semibold">Notifications</p>
                  <span className="rounded-full bg-brand-400/10 px-2 py-0.5 text-[10px] font-semibold text-brand-400">1 new</span>
                </div>
                <div className="p-3">
                  <div className="rounded-xl bg-white/[0.035] p-3">
                    <p className="text-xs font-medium">Your workspace is ready</p>
                    <p className="mt-1 text-[11px] leading-5 text-white/35">GGSP’s new enterprise shell is active for your assigned role.</p>
                  </div>
                  <p className="py-5 text-center text-xs text-white/25">Operational notifications will appear here.</p>
                </div>
              </div>
            )}
          </div>
          <div className="relative">
            <button onClick={() => { setProfileOpen((value) => !value); setNotificationsOpen(false); }} className="flex h-10 items-center gap-2 rounded-xl border border-white/[0.07] px-1.5 pr-2 text-left transition hover:bg-white/5" aria-label="Open user menu" aria-expanded={profileOpen}>
              <span className="flex h-7 w-7 items-center justify-center rounded-lg bg-brand-400 text-[10px] font-bold text-surface-950">{initials(user.name)}</span>
              <span className="hidden max-w-28 truncate text-xs font-medium md:block">{user.name}</span>
              <ChevronDown size={13} className="text-white/30" />
            </button>
            {profileOpen && (
              <div className="surface-panel absolute right-0 top-12 w-64 overflow-hidden p-2">
                <div className="border-b border-white/[0.06] px-3 py-3">
                  <p className="truncate text-sm font-semibold">{user.name}</p>
                  <p className="mt-1 truncate text-[11px] text-white/35">{user.email}</p>
                </div>
                <Link href="/admin/settings" className="mt-2 flex items-center gap-3 rounded-lg px-3 py-2 text-xs text-white/50 hover:bg-white/5 hover:text-white"><UserRound size={15} /> Profile</Link>
                <Link href="/admin/settings" className="flex items-center gap-3 rounded-lg px-3 py-2 text-xs text-white/50 hover:bg-white/5 hover:text-white"><Settings size={15} /> Settings</Link>
                <form action={unifiedSignOut} className="mt-1 border-t border-white/[0.06] pt-1">
                  <button className="flex w-full items-center gap-3 rounded-lg px-3 py-2 text-xs text-red-300/70 hover:bg-red-400/[0.06] hover:text-red-300"><LogOut size={15} /> Sign out</button>
                </form>
              </div>
            )}
          </div>
        </div>
      </header>
      <main className="mx-auto max-w-[1600px] px-4 py-6 sm:px-6 lg:px-8 lg:py-8">{children}</main>
    </div>
  );
}
