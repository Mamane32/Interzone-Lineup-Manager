"use client";

import SharedModal from "@/components/ui/Modal";

/** Thin re-export pinned to this directory's historical size — see components/ui/Modal.tsx for the consolidated implementation. */
export default function Modal({ children, onClose }: { children: React.ReactNode; onClose: () => void }) {
  return (
    <SharedModal onClose={onClose} size="sm">
      {children}
    </SharedModal>
  );
}
