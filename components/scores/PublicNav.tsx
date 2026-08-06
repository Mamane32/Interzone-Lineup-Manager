import Link from "next/link";
import { Home, Newspaper, Radio, Trophy, User } from "lucide-react";

export type PublicNavPage = "home" | "competition" | "news" | "account";

/**
 * GGScoreLive's fixed bottom tab bar — extracted out of app/scores/page.tsx
 * (which previously built this inline, with no way to reach it from
 * /scores/competition or /match/[matchId]) so every public page shares one
 * nav instead of each page needing its own copy or, worse, having no way
 * back to the hub at all. News now links to the real News Center (Sprint 4
 * Phase 4) — Account stays a disabled "Byento" (Soon) placeholder, since
 * GGScoreLive still has no visitor account system.
 */
export default function PublicNav({ active, hasLive }: { active: PublicNavPage; hasLive: boolean }) {
  return (
    <nav className="fixed inset-x-0 bottom-0 z-40 border-t border-white/[0.08] bg-surface-950/95 backdrop-blur-xl">
      <div className="relative mx-auto flex max-w-2xl items-center justify-between px-6 py-2.5">
        <Link href="/scores" className="flex flex-col items-center gap-1 px-2 py-1">
          <Home size={20} className={active === "home" ? "text-brand-400" : "text-white/50"} />
          <span className={`text-[10px] font-semibold ${active === "home" ? "text-brand-400" : "text-white/50"}`}>Home</span>
        </Link>
        <Link href="/scores/competition" className="flex flex-col items-center gap-1 px-2 py-1">
          <Trophy size={20} className={active === "competition" ? "text-brand-400" : "text-white/50"} />
          <span className={`text-[10px] font-semibold ${active === "competition" ? "text-brand-400" : "text-white/50"}`}>Competition</span>
        </Link>

        <Link
          href={hasLive ? "/scores#live-now" : "/scores"}
          className={`-mt-7 flex h-14 w-14 flex-none flex-col items-center justify-center gap-0.5 rounded-full border-4 border-surface-950 font-display text-[9px] font-bold uppercase tracking-wide shadow-lg transition ${
            hasLive ? "bg-brand-400 text-surface-950" : "bg-white/10 text-white/30"
          }`}
        >
          <Radio size={16} />
          Live
        </Link>

        <Link href="/scores/news" className="flex flex-col items-center gap-1 px-2 py-1">
          <Newspaper size={20} className={active === "news" ? "text-brand-400" : "text-white/50"} />
          <span className={`text-[10px] font-semibold ${active === "news" ? "text-brand-400" : "text-white/50"}`}>News</span>
        </Link>
        <div className="flex flex-col items-center gap-1 px-2 py-1 opacity-40">
          <User size={20} className="text-white/50" />
          <span className="text-[10px] font-semibold text-white/50">Account</span>
          <span className="text-[7px] font-bold uppercase tracking-wide text-white/25">Byento</span>
        </div>
      </div>
    </nav>
  );
}
