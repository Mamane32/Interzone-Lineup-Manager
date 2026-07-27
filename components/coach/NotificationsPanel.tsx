"use client";

import { useState } from "react";
import { Bell, CalendarClock, AlarmClock, CheckCircle2, MessageSquare } from "lucide-react";

export type NotificationItem = {
  id: string;
  icon: "scheduled" | "reminder24" | "reminder1" | "submitted" | "admin";
  title: string;
  body: string;
};

const ICONS = {
  scheduled: CalendarClock,
  reminder24: AlarmClock,
  reminder1: AlarmClock,
  submitted: CheckCircle2,
  admin: MessageSquare,
} as const;

export default function NotificationsPanel({ items }: { items: NotificationItem[] }) {
  const [open, setOpen] = useState(false);

  return (
    <div className="relative">
      <button
        type="button"
        onClick={() => setOpen((v) => !v)}
        className="relative flex h-10 w-10 items-center justify-center rounded-full bg-white/10 text-white hover:bg-white/15"
        aria-label="Notifikasyon"
      >
        <Bell size={18} />
        {items.length > 0 && (
          <span className="absolute right-1.5 top-1.5 h-2 w-2 rounded-full bg-status-correction" />
        )}
      </button>

      {open && (
        <>
          <div className="fixed inset-0 z-20" onClick={() => setOpen(false)} />
          <div className="absolute right-0 z-30 mt-2 w-80 max-w-[85vw] rounded-2xl border border-ink-line bg-ink-panel p-2 shadow-2xl">
            <p className="px-2 py-1.5 text-xs font-semibold uppercase tracking-wide text-ink-muted">
              Notifikasyon
            </p>
            <div className="flex max-h-80 flex-col gap-1.5 overflow-y-auto">
              {items.length === 0 && (
                <p className="px-2 py-4 text-center text-sm text-ink-muted">Pa gen notifikasyon.</p>
              )}
              {items.map((n) => {
                const Icon = ICONS[n.icon];
                return (
                  <div key={n.id} className="flex gap-3 rounded-xl bg-ink p-3">
                    <span className="flex h-9 w-9 flex-none items-center justify-center rounded-full bg-amber-signal/10 text-amber-signal">
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
