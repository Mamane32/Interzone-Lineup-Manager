"use client";

import { useEffect, type RefObject } from "react";

/** Calls `onOutside` on any pointerdown outside `ref`'s element. Disabled when `enabled` is false. */
export function useClickOutside(ref: RefObject<HTMLElement>, onOutside: () => void, enabled = true) {
  useEffect(() => {
    if (!enabled) return;
    function handle(e: PointerEvent) {
      if (ref.current && e.target instanceof Node && !ref.current.contains(e.target)) onOutside();
    }
    document.addEventListener("pointerdown", handle);
    return () => document.removeEventListener("pointerdown", handle);
  }, [ref, onOutside, enabled]);
}

/** Calls `onEscape` when the Escape key is pressed. Disabled when `enabled` is false. */
export function useEscapeKey(onEscape: () => void, enabled = true) {
  useEffect(() => {
    if (!enabled) return;
    function handle(e: KeyboardEvent) {
      if (e.key === "Escape") onEscape();
    }
    document.addEventListener("keydown", handle);
    return () => document.removeEventListener("keydown", handle);
  }, [onEscape, enabled]);
}

/** Combines both — the standard dismissal behavior for any menu/popover/dialog in the app. */
export function useDismissableLayer(ref: RefObject<HTMLElement>, onDismiss: () => void, enabled = true) {
  useClickOutside(ref, onDismiss, enabled);
  useEscapeKey(onDismiss, enabled);
}
