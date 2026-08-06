"use client";

import { X } from "lucide-react";
import { useEscapeKey } from "@/lib/hooks";

export default function Drawer({
  title,
  subtitle,
  onClose,
  children,
}: {
  title: string;
  subtitle?: string;
  onClose: () => void;
  children: React.ReactNode;
}) {
  useEscapeKey(onClose);

  return (
    <div className="fixed inset-0 z-50 flex justify-end bg-black/70 backdrop-blur-sm" onClick={onClose} role="presentation">
      <div
        className="ggsp-drawer-panel animate-slide-in h-full w-full max-w-md overflow-y-auto border-l border-white/[0.08] bg-surface-950 p-5 shadow-panel"
        onClick={(e) => e.stopPropagation()}
        role="dialog"
        aria-modal="true"
      >
        <div className="mb-4 flex items-start justify-between">
          <div>
            <h2 className="font-display text-lg font-semibold text-white">{title}</h2>
            {subtitle && <p className="text-sm text-white/40">{subtitle}</p>}
          </div>
          <button type="button" onClick={onClose} className="rounded-lg p-1.5 text-white/40 transition hover:bg-white/5 hover:text-white" aria-label="Close">
            <X size={18} />
          </button>
        </div>
        {children}
      </div>
    </div>
  );
}
