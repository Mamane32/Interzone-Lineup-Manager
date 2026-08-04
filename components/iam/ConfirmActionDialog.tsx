"use client";

import { useState, useTransition } from "react";
import { AlertTriangle, X } from "lucide-react";
import Button from "@/components/ui/Button";
import Modal from "@/components/ui/Modal";

type ActionResult = { ok: true } | { ok: false; error: string } | void;

export default function ConfirmActionDialog({
  triggerLabel,
  triggerVariant = "secondary",
  triggerIcon,
  title,
  body,
  confirmLabel,
  action,
  disabled = false,
  disabledReason,
}: {
  triggerLabel: string;
  triggerVariant?: "secondary" | "danger";
  /** When provided, the trigger renders as a compact icon-only square
   * button (triggerLabel becomes its aria-label) instead of the default
   * full text Button — for dense rows (e.g. a player list) where a
   * labeled button would be too wide. Existing callers are unaffected. */
  triggerIcon?: React.ReactNode;
  title: string;
  body: string;
  confirmLabel: string;
  action: () => Promise<ActionResult>;
  /** When true, the trigger renders inert with disabledReason as a native
   * tooltip instead of opening the dialog — for actions that are only
   * conditionally available (e.g. eligibility rules based on account status). */
  disabled?: boolean;
  disabledReason?: string;
}) {
  const [open, setOpen] = useState(false);
  const [pending, startTransition] = useTransition();
  const [error, setError] = useState<string | null>(null);

  function confirm() {
    setError(null);
    startTransition(async () => {
      const result = await action();
      if (result && result.ok === false) {
        setError(result.error);
        return;
      }
      setOpen(false);
    });
  }

  function openDialog() {
    setError(null);
    setOpen(true);
  }

  return (
    <>
      {triggerIcon ? (
        <button
          type="button"
          onClick={openDialog}
          disabled={disabled}
          title={disabled ? disabledReason : triggerLabel}
          aria-label={triggerLabel}
          className={`flex h-8 w-8 items-center justify-center rounded-lg transition disabled:cursor-not-allowed disabled:opacity-40 ${
            triggerVariant === "danger"
              ? "bg-status-correction/10 text-status-correction hover:bg-status-correction/20"
              : "bg-ink/5 text-ink/50 hover:bg-ink/10 hover:text-ink"
          }`}
        >
          {triggerIcon}
        </button>
      ) : (
        <Button
          type="button"
          variant={triggerVariant}
          size="md"
          onClick={openDialog}
          disabled={disabled}
          title={disabled ? disabledReason : undefined}
        >
          {triggerLabel}
        </Button>
      )}

      {open && (
        <Modal onClose={() => setOpen(false)} role="alertdialog" labelledBy="confirm-dialog-title">
          <div className="mb-3 flex items-start justify-between">
            <span className="flex h-10 w-10 items-center justify-center rounded-full bg-status-correction/10 text-status-correction">
              <AlertTriangle size={18} />
            </span>
            <button type="button" onClick={() => setOpen(false)} className="rounded-lg p-1.5 text-white/40 transition hover:bg-white/5 hover:text-white" aria-label="Close">
              <X size={18} />
            </button>
          </div>
          <h2 id="confirm-dialog-title" className="font-display text-base font-semibold text-white">
            {title}
          </h2>
          <p className="mt-1.5 text-sm text-white/40">{body}</p>
          {error && (
            <p role="alert" className="mt-3 rounded-lg bg-status-correction/10 px-3 py-2 text-sm font-medium text-status-correction">
              {error}
            </p>
          )}
          <div className="mt-4 flex gap-2">
            <Button type="button" variant="secondary" size="md" onClick={() => setOpen(false)} className="flex-1">
              Cancel
            </Button>
            <Button type="button" variant="danger" size="md" onClick={confirm} disabled={pending} className="flex-1">
              {pending ? "..." : confirmLabel}
            </Button>
          </div>
        </Modal>
      )}
    </>
  );
}
