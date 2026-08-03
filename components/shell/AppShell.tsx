"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import Image from "next/image";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { useDismissableLayer, useEscapeKey } from "@/lib/hooks";
import {
  Bell,
  ChevronDown,
  ChevronRight,
  CircleHelp,
  Command,
  LogOut,
  Menu,
  PanelLeftClose,
  PanelLeftOpen,
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
  icon?: LucideIcon;
  items: ShellNavItem[];
};

const SIDEBAR_COLLAPSE_KEY = "ggsp-sidebar-collapsed";

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
  user: { name: string; email: string; role: string; avatarUrl?: string | null };
  workspaceLabel: string;
}) {
  const pathname = usePathname();
  const [mobileOpen, setMobileOpen] = useState(false);
  const [notificationsOpen, setNotificationsOpen] = useState(false);
  const [profileOpen, setProfileOpen] = useState(false);
  const [collapsed, setCollapsed] = useState(false);
  const notificationsRef = useRef<HTMLDivElement>(null);
  const profileRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    setMobileOpen(false);
    setNotificationsOpen(false);
    setProfileOpen(false);
  }, [pathname]);

  useEffect(() => {
    if (window.localStorage.getItem(SIDEBAR_COLLAPSE_KEY) === "1") setCollapsed(true);
  }, []);

  // Standard dismissal behavior for every popover in the shell: click
  // anywhere outside, or press Escape, and it closes. Route changes also
  // close them (above) since AppShell persists across admin navigation.
  useDismissableLayer(notificationsRef, () => setNotificationsOpen(false), notificationsOpen);
  useDismissableLayer(profileRef, () => setProfileOpen(false), profileOpen);
  useEscapeKey(() => setMobileOpen(false), mobileOpen);

  function toggleCollapsed() {
    setCollapsed((value) => {
      const next = !value;
      window.localStorage.setItem(SIDEBAR_COLLAPSE_KEY, next ? "1" : "0");
      return next;
    });
  }

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

  const railWidth = collapsed ? "w-[76px]" : "w-[264px]";

  const sidebar = (
    <aside className={`flex h-full flex-col bg-surface-900 transition-[width] duration-200 ${railWidth}`}>
      <div className={`flex h-16 items-center border-b border-white/[0.06] ${collapsed ? "justify-center px-2" : "justify-between px-5"}`}>
        <BrandMark href="/admin/dashboard" compact={collapsed} />
        <button onClick={() => setMobileOpen(false)} className="rounded-lg p-2 text-white/40 hover:bg-white/5 hover:text-white lg:hidden" aria-label="Close navigation">
          <X size={19} />
        </button>
      </div>

      <nav className={`flex-1 overflow-y-auto py-4 ${collapsed ? "px-2" : "px-3"}`} aria-label="Workspace navigation">
        {nav.map((group) => (
          <div key={group.label} className="mb-6">
            {!collapsed && (
              <p className="mb-2 flex items-center gap-1.5 px-3 text-[10px] font-semibold uppercase tracking-[.18em] text-white/25">
                {group.icon && <group.icon size={11} className="text-white/20" />}
                {group.label}
              </p>
            )}
            <div className="space-y-1">
              {group.items.map(({ href, label, icon: Icon }) => {
                const active = pathname === href || (href !== "/admin/dashboard" && pathname.startsWith(`${href}/`));
                return (
                  <Link
                    key={href}
                    href={href}
                    title={collapsed ? label : undefined}
                    aria-current={active ? "page" : undefined}
                    className={`group relative flex items-center gap-3 rounded-xl py-2.5 text-sm transition ${collapsed ? "justify-center px-0" : "px-3"} ${
                      active ? "bg-brand-400 text-surface-950 shadow-glow" : "text-white/45 hover:bg-white/[0.045] hover:text-white"
                    }`}
                  >
                    <Icon size={17} aria-hidden="true" className="flex-none" />
                    {!collapsed && (
                      <>
                        <span className="flex-1 truncate">{label}</span>
                        {active && <ChevronRight size={14} />}
                      </>
                    )}
                    {collapsed && (
                      <span className="pointer-events-none absolute left-full ml-2 hidden whitespace-nowrap rounded-lg bg-surface-700 px-2.5 py-1.5 text-xs font-medium text-white shadow-panel group-hover:block">
                        {label}
                      </span>
                    )}
                  </Link>
                );
              })}
            </div>
          </div>
        ))}
      </nav>

      <div className={`border-t border-white/[0.06] p-3 ${collapsed ? "flex flex-col items-center gap-1" : ""}`}>
        <Link
          href="/admin/settings"
          title={collapsed ? "Help & resources" : undefined}
          className={`flex items-center gap-3 rounded-xl text-sm text-white/40 transition hover:bg-white/[0.045] hover:text-white ${collapsed ? "justify-center p-2.5" : "px-3 py-2.5"}`}
        >
          <CircleHelp size={17} className="flex-none" /> {!collapsed && "Help & resources"}
        </Link>
        <button
          onClick={toggleCollapsed}
          className={`hidden items-center gap-3 rounded-xl text-sm text-white/40 transition hover:bg-white/[0.045] hover:text-white lg:flex ${collapsed ? "justify-center p-2.5" : "w-full px-3 py-2.5"}`}
          aria-label={collapsed ? "Expand navigation" : "Collapse navigation"}
        >
          {collapsed ? <PanelLeftOpen size={17} className="flex-none" /> : <PanelLeftClose size={17} className="flex-none" />}
          {!collapsed && "Collapse"}
        </button>
      </div>
    </aside>
  );

  return (
    <div className={`min-h-screen bg-surface-950 text-white transition-[padding] duration-200 ${collapsed ? "lg:pl-[76px]" : "lg:pl-[264px]"}`}>
      <div className={`fixed inset-y-0 left-0 z-40 hidden border-r border-white/[0.06] transition-[width] duration-200 lg:block ${collapsed ? "w-[76px]" : "w-[264px]"}`}>{sidebar}</div>
      {mobileOpen && (
        <div className="fixed inset-0 z-50 lg:hidden">
          <button className="absolute inset-0 bg-black/70 backdrop-blur-sm" onClick={() => setMobileOpen(false)} aria-label="Close navigation overlay" />
          <div className="relative h-full w-[min(88vw,300px)] border-r border-white/[0.08] shadow-2xl">
            <div className="flex h-full flex-col bg-surface-900 w-[min(88vw,300px)]">
              <div className="flex h-16 items-center justify-between border-b border-white/[0.06] px-5">
                <BrandMark href="/admin/dashboard" />
                <button onClick={() => setMobileOpen(false)} className="rounded-lg p-2 text-white/40 hover:bg-white/5 hover:text-white" aria-label="Close navigation">
                  <X size={19} />
                </button>
              </div>
              <nav className="flex-1 overflow-y-auto px-3 py-4" aria-label="Workspace navigation">
                {nav.map((group) => (
                  <div key={group.label} className="mb-6">
                    <p className="mb-2 px-3 text-[10px] font-semibold uppercase tracking-[.18em] text-white/25">{group.label}</p>
                    <div className="space-y-1">
                      {group.items.map(({ href, label, icon: Icon }) => {
                        const active = pathname === href || (href !== "/admin/dashboard" && pathname.startsWith(`${href}/`));
                        return (
                          <Link key={href} href={href} aria-current={active ? "page" : undefined} className={`flex items-center gap-3 rounded-xl px-3 py-2.5 text-sm transition ${active ? "bg-brand-400 text-surface-950 shadow-glow" : "text-white/45 hover:bg-white/[0.045] hover:text-white"}`}>
                            <Icon size={17} aria-hidden="true" />
                            <span className="flex-1">{label}</span>
                          </Link>
                        );
                      })}
                    </div>
                  </div>
                ))}
              </nav>
            </div>
          </div>
        </div>
      )}

      <header className="sticky top-0 z-30 border-b border-white/[0.06] bg-surface-950/85 backdrop-blur-xl">
        <div className="flex h-16 items-center gap-3 px-4 sm:px-6 lg:px-8">
          <button onClick={() => setMobileOpen(true)} className="rounded-xl border border-white/[0.07] p-2.5 text-white/55 hover:bg-white/5 hover:text-white lg:hidden" aria-label="Open navigation">
            <Menu size={19} />
          </button>

          <div className="hidden items-center gap-2 rounded-full border border-white/[0.08] bg-white/[0.03] py-1.5 pl-1.5 pr-3 text-xs sm:flex">
            <span className="flex h-6 w-6 items-center justify-center rounded-full bg-brand-400/15 text-brand-400"><ShieldCheck size={12} /></span>
            <span className="font-semibold text-white/80">{workspaceLabel}</span>
            <span className="text-white/25">·</span>
            <span className="text-white/45">{user.role}</span>
          </div>

          <div className="hidden min-w-0 flex-1 items-center gap-2 text-xs lg:flex">
            <ChevronRight size={12} className="text-white/15" />
            {breadcrumbs.map((item, index) => (
              <span key={`${item.href}-${index}`} className="flex min-w-0 items-center gap-2">
                <Link href={item.href} className={`truncate ${index === breadcrumbs.length - 1 ? "font-medium text-white/70" : "text-white/30 hover:text-white"}`}>{item.label}</Link>
                {index < breadcrumbs.length - 1 && <ChevronRight size={12} className="text-white/15" />}
              </span>
            ))}
          </div>

          <button className="ml-auto hidden h-10 w-full max-w-sm items-center gap-2 rounded-xl border border-white/[0.08] bg-white/[0.03] px-3 text-left text-xs text-white/30 transition hover:border-brand-400/30 hover:bg-white/[0.045] sm:flex" aria-label="Search platform">
            <Command size={14} /> Search matches, teams, users…
            <kbd className="ml-auto rounded-md border border-white/10 bg-white/5 px-1.5 py-0.5 text-[9px] font-semibold">⌘K</kbd>
          </button>

          <span className="hidden items-center gap-1.5 whitespace-nowrap rounded-full border border-emerald-400/20 bg-emerald-400/[0.08] px-2.5 py-1.5 text-[10px] font-semibold uppercase tracking-wider text-emerald-300 xl:flex">
            <span className="relative flex h-1.5 w-1.5">
              <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-emerald-400 opacity-75" />
              <span className="relative inline-flex h-1.5 w-1.5 rounded-full bg-emerald-400" />
            </span>
            All systems operational
          </span>

          <div className="relative ml-auto sm:ml-0" ref={notificationsRef}>
            <button onClick={() => { setNotificationsOpen((value) => !value); setProfileOpen(false); }} className="relative flex h-10 w-10 flex-none items-center justify-center rounded-xl border border-white/[0.07] text-white/50 transition hover:bg-white/5 hover:text-white" aria-label="Notifications" aria-expanded={notificationsOpen}>
              <Bell size={18} />
              <span className="absolute right-2 top-2 h-1.5 w-1.5 rounded-full bg-brand-400 ring-2 ring-surface-950" />
            </button>
            <div
              role="menu"
              aria-hidden={!notificationsOpen}
              className={`surface-panel-solid absolute right-0 top-12 w-[min(88vw,360px)] origin-top-right overflow-hidden p-0 transition-all duration-150 ease-out ${
                notificationsOpen ? "pointer-events-auto scale-100 opacity-100" : "pointer-events-none scale-95 opacity-0"
              }`}
            >
              <div className="flex items-center justify-between border-b border-white/[0.06] px-4 py-3">
                <p className="text-sm font-semibold">Notifications</p>
                <span className="rounded-full bg-brand-400/10 px-2 py-0.5 text-[10px] font-semibold text-brand-400">1 new</span>
              </div>
              <div className="p-3">
                <div className="rounded-xl bg-white/[0.035] p-3">
                  <p className="text-xs font-medium">Your workspace is ready</p>
                  <p className="mt-1 text-[11px] leading-5 text-white/35">GoodGrafik&apos;s enterprise console is active for your assigned role.</p>
                </div>
                <p className="py-5 text-center text-xs text-white/25">Operational notifications will appear here.</p>
              </div>
            </div>
          </div>
          <div className="relative" ref={profileRef}>
            <button onClick={() => { setProfileOpen((value) => !value); setNotificationsOpen(false); }} className="flex h-10 flex-none items-center gap-2 rounded-xl border border-white/[0.07] px-1.5 pr-2 text-left transition hover:bg-white/5" aria-label="Open user menu" aria-expanded={profileOpen}>
              {user.avatarUrl ? (
                <Image src={user.avatarUrl} alt="" width={28} height={28} className="h-7 w-7 flex-none rounded-lg object-cover" />
              ) : (
                <span className="flex h-7 w-7 flex-none items-center justify-center rounded-lg bg-brand-400 text-[10px] font-bold text-surface-950">{initials(user.name)}</span>
              )}
              <span className="hidden max-w-28 truncate text-xs font-medium md:block">{user.name}</span>
              <ChevronDown size={13} className="text-white/30" />
            </button>
            <div
              role="menu"
              aria-hidden={!profileOpen}
              className={`surface-panel-solid absolute right-0 top-12 w-64 origin-top-right overflow-hidden p-2 transition-all duration-150 ease-out ${
                profileOpen ? "pointer-events-auto scale-100 opacity-100" : "pointer-events-none scale-95 opacity-0"
              }`}
            >
              <div className="border-b border-white/[0.06] px-3 py-3">
                <p className="truncate text-sm font-semibold">{user.name}</p>
                <p className="mt-1 truncate text-[11px] text-white/35">{user.email}</p>
              </div>
              <Link href="/admin/settings" onClick={() => setProfileOpen(false)} className="mt-2 flex items-center gap-3 rounded-lg px-3 py-2 text-xs text-white/50 hover:bg-white/5 hover:text-white"><UserRound size={15} /> Profile</Link>
              <Link href="/admin/settings" onClick={() => setProfileOpen(false)} className="flex items-center gap-3 rounded-lg px-3 py-2 text-xs text-white/50 hover:bg-white/5 hover:text-white"><Settings size={15} /> Settings</Link>
              <form action={unifiedSignOut} className="mt-1 border-t border-white/[0.06] pt-1">
                <button className="flex w-full items-center gap-3 rounded-lg px-3 py-2 text-xs text-red-300/70 hover:bg-red-400/[0.06] hover:text-red-300"><LogOut size={15} /> Sign out</button>
              </form>
            </div>
          </div>
        </div>
      </header>
      <main className="mx-auto max-w-[1680px] px-4 py-7 sm:px-6 lg:px-8 lg:py-9">{children}</main>
    </div>
  );
}
