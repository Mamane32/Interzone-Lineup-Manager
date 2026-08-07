"use client";

import { useEffect, useRef, useState } from "react";
import { createPortal } from "react-dom";
import { Search, X } from "lucide-react";
import { useEscapeKey } from "@/lib/hooks";
import { searchMatchesAction } from "@/app/scores/actions";
import type { PublicScoreMatch } from "@/lib/public-scores";
import MatchRow from "@/components/scores/MatchRow";

const DEBOUNCE_MS = 300;

/**
 * The GoodGrafik master shell's search control. There is no cross-
 * platform search index yet — Culture/News/Studio have no content to
 * search — so rather than fabricate a search box that quietly does
 * nothing for 3 of 4 worlds, this is scoped honestly: it searches real
 * Sports data (the same searchMatchesAction/searchPublicMatches
 * GGScoreLive's own ScoresSearch already uses) and says plainly, above
 * the input, that Culture/News/Studio search is still to come. When a
 * real cross-platform index exists, this is the one place that needs to
 * change — every entry point already routes through here.
 *
 * Portaled to document.body for the same reason as MasterMenu: this
 * component's DOM parent, MasterHeader, has `backdrop-blur-xl`, which
 * turns the header into the containing block for any `position: fixed`
 * descendant — rendered in place, the overlay would collapse to the
 * header's own ~64px height instead of covering the screen.
 */
export default function MasterSearch() {
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
      searchMatchesAction(trimmed)
        .then(setResults)
        .finally(() => setLoading(false));
    }, DEBOUNCE_MS);
    return () => clearTimeout(timer);
  }, [query]);

  return (
    <>
      <button
        type="button"
        onClick={() => setOpen(true)}
        aria-label="Chèche"
        className="flex h-10 w-10 flex-none items-center justify-center rounded-full border border-white/[0.08] text-white/70 transition hover:border-brand-400/40 hover:text-white"
      >
        <Search size={17} />
      </button>

      {open &&
        createPortal(
          <div className="fixed inset-0 z-[90] flex flex-col bg-surface-950/95 backdrop-blur-xl" role="dialog" aria-modal="true" aria-label="Chèche">
          <div
            className="flex items-center gap-2 border-b border-white/[0.08] px-4 pb-3 pl-[max(1rem,env(safe-area-inset-left))] pr-[max(1rem,env(safe-area-inset-right))] pt-[max(0.75rem,env(safe-area-inset-top))]"
          >
            <Search size={16} className="flex-none text-white/30" />
            <input
              ref={inputRef}
              type="text"
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              placeholder="Chèche yon ekip oswa yon match Sports…"
              className="h-10 flex-1 bg-transparent text-sm text-white placeholder:text-white/25 focus:outline-none"
            />
            <button type="button" onClick={() => setOpen(false)} aria-label="Fèmen rechèch la" className="flex-none rounded-lg p-1.5 text-white/40 hover:bg-white/5 hover:text-white">
              <X size={18} />
            </button>
          </div>

          <div className="mx-auto flex w-full max-w-2xl flex-1 flex-col gap-2 overflow-y-auto p-4">
            <p className="rounded-xl bg-white/[0.03] px-3.5 py-2.5 text-xs leading-5 text-white/40">
              Kounye a, rechèch la fèt sèlman nan <span className="font-semibold text-brand-400">Sports</span>. Rechèch pou Culture, News ak Studio ap vini pita.
            </p>
            {query.trim().length < 2 && <p className="pt-6 text-center text-sm text-white/30">Tape omwen 2 karaktè pou chèche.</p>}
            {loading && <p className="pt-6 text-center text-sm text-white/30">Ap chèche…</p>}
            {!loading && query.trim().length >= 2 && results.length === 0 && (
              <p className="pt-6 text-center text-sm text-white/30">Pa gen rezilta pou &quot;{query.trim()}&quot;.</p>
            )}
            {results.map((m) => (
              <MatchRow key={m.matchId} match={m} />
            ))}
          </div>
          </div>,
          document.body
        )}
    </>
  );
}
