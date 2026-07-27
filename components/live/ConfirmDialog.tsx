"use client";

import { AlertTriangle } from "lucide-react";
import Modal from "./Modal";

export default function ConfirmDialog({
  title,
  body,
  confirmLabel,
  pending,
  onConfirm,
  onClose,
}: {
  title: string;
  body: string;
  confirmLabel: string;
  pending: boolean;
  onConfirm: () => void;
  onClose: () => void;
}) {
  return (
    <Modal onClose={onClose}>
      <div className="flex flex-col items-center gap-3 text-center">
        <span className="flex h-11 w-11 items-center justify-center rounded-full bg-red-500/15 text-red-400">
          <AlertTriangle size={20} />
        </span>
        <div>
          <h3 className="font-display text-base font-semibold">{title}</h3>
          <p className="mt-1 text-sm text-white/50">{body}</p>
        </div>
        <div className="mt-2 flex w-full gap-2">
          <button
            type="button"
            onClick={onClose}
            className="h-11 flex-1 rounded-lg bg-white/5 text-sm font-semibold text-white/70 hover:bg-white/10"
          >
            Cancel
          </button>
          <button
            type="button"
            onClick={onConfirm}
            disabled={pending}
            className="h-11 flex-1 rounded-lg bg-red-500 text-sm font-semibold text-white hover:brightness-95 disabled:opacity-40"
          >
            {pending ? "..." : confirmLabel}
          </button>
        </div>
      </div>
    </Modal>
  );
}
