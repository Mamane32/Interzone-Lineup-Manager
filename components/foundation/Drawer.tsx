"use client";

import { X } from "lucide-react";

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
  return (
    <div className="fixed inset-0 z-50 flex justify-end bg-black/60" onClick={onClose} role="presentation">
      <div
        className="h-full w-full max-w-md overflow-y-auto border-l border-ink-line bg-ink-panel p-5"
        onClick={(e) => e.stopPropagation()}
        role="dialog"
        aria-modal="true"
      >
        <div className="mb-4 flex items-start justify-between">
          <div>
            <h2 className="font-display text-lg font-semibold text-white">{title}</h2>
            {subtitle && <p className="text-sm text-ink-muted">{subtitle}</p>}
          </div>
          <button type="button" onClick={onClose} className="text-ink-muted hover:text-white" aria-label="Close">
            <X size={18} />
          </button>
        </div>
        {children}
      </div>
    </div>
  );
}
