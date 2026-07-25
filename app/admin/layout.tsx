import Link from "next/link";
import { logout } from "./login/actions";

const NAV = [
  { href: "/admin/dashboard", label: "Dashboard" },
  { href: "/admin/competitions", label: "Competitions" },
  { href: "/admin/matches", label: "Matches" },
  { href: "/admin/teams", label: "Teams" },
  { href: "/admin/lineups", label: "Lineups" },
  { href: "/admin/settings", label: "Settings" },
];

export default function AdminLayout({ children }: { children: React.ReactNode }) {
  return (
    <div className="min-h-screen bg-ink text-white">
      <header className="sticky top-0 z-10 border-b border-ink-line bg-ink/95 backdrop-blur">
        <div className="mx-auto flex max-w-6xl items-center justify-between px-4 py-3">
          <div className="flex items-center gap-2">
            <span className="h-2.5 w-2.5 rounded-full bg-status-correction" />
            <span className="font-display text-sm uppercase tracking-[0.2em] text-amber-signal">
              Interzone
            </span>
            <span className="hidden font-display text-sm text-white/70 sm:inline">
              Lineup Manager
            </span>
          </div>
          <form action={logout}>
            <button className="text-sm text-ink-muted hover:text-white">Sign out</button>
          </form>
        </div>
        <nav className="mx-auto flex max-w-6xl gap-1 overflow-x-auto px-4 pb-2">
          {NAV.map((item) => (
            <Link
              key={item.href}
              href={item.href}
              className="whitespace-nowrap rounded-lg px-3 py-1.5 text-sm font-medium text-ink-muted hover:bg-white/5 hover:text-white"
            >
              {item.label}
            </Link>
          ))}
        </nav>
      </header>
      <main className="mx-auto max-w-6xl px-4 py-8">{children}</main>
    </div>
  );
}
