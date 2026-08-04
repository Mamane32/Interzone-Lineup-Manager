"use client";

import { useEscapeKey } from "@/lib/hooks";

/**
 * Single shared modal primitive. Previously implemented independently in
 * components/foundation/Modal.tsx and components/live/Modal.tsx (plus a
 * third, inline copy in components/iam/ConfirmActionDialog.tsx) — all three
 * built the same "centered overlay, backdrop click closes, Escape closes"
 * behavior by hand, and had already drifted (only some had
 * role="dialog"/aria-modal). Consolidated here; the two directory-local
 * Modal.tsx files now just re-export this with their historical size, so no
 * call site had to change.
 */
export default function Modal({
  children,
  onClose,
  size = "sm",
  role = "dialog",
  labelledBy,
}: {
  children: React.ReactNode;
  onClose: () => void;
  size?: "sm" | "lg";
  /** "alertdialog" for confirmations that interrupt and demand a response (e.g. destructive actions) vs. the default "dialog" for ordinary forms/content. */
  role?: "dialog" | "alertdialog";
  /** Id of the element containing the dialog's title, for aria-labelledby. */
  labelledBy?: string;
}) {
  useEscapeKey(onClose);

  return (
    <div
      className="fixed inset-0 z-50 flex items-end justify-center bg-black/70 p-4 backdrop-blur-sm sm:items-center"
      onClick={onClose}
      role="presentation"
    >
      <div
        className={`surface-panel animate-scale-in w-full overflow-y-auto p-5 ${
          size === "lg" ? "max-h-[90vh] max-w-lg" : "max-w-sm"
        }`}
        onClick={(e) => e.stopPropagation()}
        role={role}
        aria-modal="true"
        aria-labelledby={labelledBy}
      >
        {children}
      </div>
    </div>
  );
}
