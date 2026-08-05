"use client";

import { useEffect, useState } from "react";
import { ChevronDown } from "lucide-react";

const STORAGE_PREFIX = "ggsp:live:collapsed:";

/**
 * Collapsible wrapper for the Broadcast Control Center's large sections
 * (Venue & Officials, Score, Match Events, Timeline, Production & Graphics
 * — GGSP Production Polish brief, Section 1C). Every large section can be
 * folded away, and the folded/open state is remembered per section — a
 * broadcast operator working from a phone shouldn't have to re-collapse
 * the same panels every time they reload during a match.
 *
 * `id` must be stable and unique per section (used as the localStorage
 * key) — it does not need to be unique per match, since which sections an
 * operator wants open is a personal preference, not something that should
 * reset for every different match.
 */
export default function CollapsibleSection({
  id,
  title,
  icon,
  meta,
  defaultOpen = true,
  children,
}: {
  id: string;
  title: string;
  icon?: React.ReactNode;
  /** Small trailing detail shown next to the title even while collapsed
   * (e.g. a live score, a count) — so collapsing a section doesn't hide
   * the one thing you'd glance at it for. */
  meta?: React.ReactNode;
  defaultOpen?: boolean;
  children: React.ReactNode;
}) {
  const [open, setOpen] = useState(defaultOpen);
  const [hydrated, setHydrated] = useState(false);

  useEffect(() => {
    try {
      const stored = window.localStorage.getItem(STORAGE_PREFIX + id);
      if (stored !== null) setOpen(stored === "1");
    } catch {
      // Private browsing / storage disabled — just fall back to defaultOpen.
    }
    setHydrated(true);
  }, [id]);

  useEffect(() => {
    if (!hydrated) return;
    try {
      window.localStorage.setItem(STORAGE_PREFIX + id, open ? "1" : "0");
    } catch {
      // Same as above — non-fatal if storage isn't available.
    }
  }, [open, hydrated, id]);

  // Deliberately no outer surface-panel here: every section this wraps
  // (MatchHeaderPanel, MatchScorePanel, StatusControls/ScoreControl/
  // EventControls, Timeline, the CenterTabs groups) already renders its own
  // surface-panel card — a second one around it would double the framing.
  // This is just a slim, always-visible toggle bar sitting above whatever
  // the section already looks like. not a redesign of it.
  return (
    <div className="flex flex-col gap-2">
      <button
        type="button"
        onClick={() => setOpen((o) => !o)}
        className="flex w-full items-center justify-between gap-2 rounded-xl border border-white/[0.06] bg-white/[0.025] px-3.5 py-2 text-left transition hover:bg-white/[0.05]"
        aria-expanded={open}
      >
        <span className="flex min-w-0 items-center gap-2 text-xs font-bold uppercase tracking-wide text-white/50">
          {icon}
          <span className="truncate">{title}</span>
        </span>
        <span className="flex flex-none items-center gap-2">
          {meta}
          <ChevronDown size={15} className={`text-white/35 transition-transform duration-200 ${open ? "rotate-180" : ""}`} />
        </span>
      </button>
      {open && children}
    </div>
  );
}
