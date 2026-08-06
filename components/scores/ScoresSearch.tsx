"use client";

import { useEffect, useRef, useState } from "react";
import { Search, X } from "lucide-react";
import { useEscapeKey } from "@/lib/hooks";
import { searchMatchesAction } from "@/app/scores/actions";
import type { PublicScoreMatch } from "@/lib/public-scores";
import MatchRow from "./MatchRow";

const DEBOUNCE_MS = 300;

/**
 * GGScoreLive home's Search — a full-screen overlay (matching
 * AssetManager/VersionHistoryPanel's modal pattern in Brand Studio, the
 * one other place in this app that already does an overlay-with-Escape
 * correctly) rather than an inline dropdown, since the home page is
 * mobile-first and a phone-width inline dropdown has nowhere good to
 * render results without shoving the rest of the page down. Debounced
 * client-side calls to searchMatchesAction (app/scores/actions.ts) — the
 * one Server Action this whole public site needs, since every other page
 * here is plain server-rendered.
 */
export default function ScoresSearch({ competitionId }: { competitionId?: string }) {
  const [open, setOpen] = useState(false);
  const [query, setQuery] = useState("");
  const [results, setResults] = useState<PublicScoreMatch[]>([]);
  const [loading, setLoading] = useState(false);
  const inputRef = useRef<HTMLInputElement>(null);

  useEscapeKey(() => setOpen(false), open);

  useEffect(() => {
    if (open) inputRef.current?.focus();
  }, [open]);

  useEffect(() => {
    const trimmed = query.trim();
    if (trimmed.length < 2) {
      setResults([]);
      setLoading(false);
      return;
    }
    setLoading(true);
    const timer = setTimeout(() => {
      searchMatchesAction(trimmed, competitionId)
        .then(setResults)
        .finally(() => setLoading(false));
    }, DEBOUNCE_MS);
    return () => clearTimeout(timer);
  }, [query, competitionId]);

  return (
    <>
      <button
        type="button"
        onClick={() => setOpen(true)}
        aria-label="Search teams and matches"
        className="flex h-10 w-10 flex-none items-center justify-center rounded-full border border-white/[0.08] text-white/50 transition hover:border-brand-400/40 hover:text-white"
      >
        <Search size={16} />
      </button>

      {open && (
        <div className="fixed inset-0 z-50 flex flex-col bg-surface-950/98 backdrop-blur-xl" role="dialog" aria-modal="true" aria-label="Search">
          <div className="flex items-center gap-2 border-b border-white/[0.08] px-4 py-3">
            <Search size={16} className="flex-none text-white/30" />
            <input
              ref={inputRef}
              type="text"
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              placeholder="Chèche yon ekip oswa yon match…"
              className="h-10 flex-1 bg-transparent text-sm text-white placeholder:text-white/25 focus:outline-none"
            />
            <button type="button" onClick={() => setOpen(false)} aria-label="Close search" className="flex-none rounded-lg p-1.5 text-white/40 hover:bg-white/5 hover:text-white">
              <X size={18} />
            </button>
          </div>

          <div className="mx-auto flex w-full max-w-2xl flex-1 flex-col gap-2 overflow-y-auto p-4">
            {query.trim().length < 2 && <p className="pt-8 text-center text-sm text-white/30">Tape omwen 2 karaktè pou chèche.</p>}
            {loading && <p className="pt-8 text-center text-sm text-white/30">Ap chèche…</p>}
            {!loading && query.trim().length >= 2 && results.length === 0 && (
              <p className="pt-8 text-center text-sm text-white/30">Pa gen rezilta pou &quot;{query.trim()}&quot;.</p>
            )}
            {results.map((m) => (
              <MatchRow key={m.matchId} match={m} />
            ))}
          </div>
        </div>
      )}
    </>
  );
}
