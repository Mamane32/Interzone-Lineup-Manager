"use client";

import { useState } from "react";
import { Bell, CalendarClock, AlarmClock, CheckCircle2, Megaphone, Target, Square } from "lucide-react";

/**
 * Icon/color system covers every event type from the Sprint 1 review,
 * including 'goal', 'yellow_card', and 'red_card' — styling is ready for
 * those, but this app has no live-match event data (that's the Broadcast
 * Control Center / Live Center, a later sprint), so only 'scheduled',
 * 'reminder24', 'reminder1', 'submitted', and 'announcement' are ever
 * actually emitted today (see dashboard/page.tsx).
 */
export type NotificationIcon =
  | "scheduled"
  | "reminder24"
  | "reminder1"
  | "submitted"
  | "announcement"
  | "goal"
  | "yellow_card"
  | "red_card";

export type NotificationItem = {
  id: string;
  icon: NotificationIcon;
  title: string;
  body: string;
};

const STYLES: Record<NotificationIcon, { Icon: typeof Bell; bg: string; text: string }> = {
  scheduled: { Icon: CalendarClock, bg: "bg-blue-500/15", text: "text-blue-400" },
  reminder24: { Icon: AlarmClock, bg: "bg-amber-signal/15", text: "text-amber-signal" },
  reminder1: { Icon: AlarmClock, bg: "bg-orange-500/15", text: "text-orange-400" },
  submitted: { Icon: CheckCircle2, bg: "bg-status-submitted/15", text: "text-status-submitted" },
  announcement: { Icon: Megaphone, bg: "bg-violet-500/15", text: "text-violet-400" },
  goal: { Icon: Target, bg: "bg-emerald-500/15", text: "text-emerald-400" },
  yellow_card: { Icon: Square, bg: "bg-yellow-400/15", text: "text-yellow-400" },
  red_card: { Icon: Square, bg: "bg-status-correction/15", text: "text-status-correction" },
};

export default function NotificationsPanel({ items }: { items: NotificationItem[] }) {
  const [open, setOpen] = useState(false);

  return (
    <div className="relative">
      <button
        type="button"
        onClick={() => setOpen((v) => !v)}
        className="relative flex h-11 w-11 items-center justify-center rounded-full bg-ink text-white shadow-sm transition-transform active:scale-95"
        aria-label="Notifikasyon"
      >
        <Bell size={18} />
        {items.length > 0 && (
          <span className="absolute right-2 top-2 h-2 w-2 rounded-full bg-status-correction" />
        )}
      </button>

      {open && (
        <>
          <div className="fixed inset-0 z-20" onClick={() => setOpen(false)} />
          <div className="animate-slide-in absolute right-0 z-30 mt-2 w-80 max-w-[85vw] rounded-2xl border border-ink-line bg-ink-panel p-2 shadow-2xl">
            <p className="px-2 py-1.5 text-xs font-semibold uppercase tracking-wide text-ink-muted">
              Notifikasyon
            </p>
            <div className="flex max-h-80 flex-col gap-1.5 overflow-y-auto">
              {items.length === 0 && (
                <p className="px-2 py-4 text-center text-sm text-ink-muted">Pa gen notifikasyon.</p>
              )}
              {items.map((n, i) => {
                const { Icon, bg, text } = STYLES[n.icon];
                return (
                  <div
                    key={n.id}
                    style={{ "--stagger": i } as React.CSSProperties}
                    className="animate-fade-up flex gap-3 rounded-xl bg-ink p-3"
                  >
                    <span className={`flex h-9 w-9 flex-none items-center justify-center rounded-full ${bg} ${text}`}>
                      <Icon size={16} />
                    </span>
                    <div className="min-w-0">
                      <p className="text-sm font-semibold text-white">{n.title}</p>
                      <p className="text-xs text-white/50">{n.body}</p>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        </>
      )}
    </div>
  );
}
