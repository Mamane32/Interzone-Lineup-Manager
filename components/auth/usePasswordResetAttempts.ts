"use client";

import { useEffect, useState } from "react";

const MAX_ATTEMPTS = 8;
const COOLDOWN_MS = 15 * 60 * 1000; // 15 minutes — a reasonable production default; the real enforcement is still Supabase's own send rate limit (see lib/auth-rate-limit.ts), this is what keeps a user from ever reaching it blind.

type StoredState = { attempts: number; cooldownUntil: number | null };

function readState(key: string): StoredState {
  if (typeof window === "undefined") return { attempts: 0, cooldownUntil: null };
  try {
    const raw = window.sessionStorage.getItem(key);
    if (!raw) return { attempts: 0, cooldownUntil: null };
    const parsed = JSON.parse(raw) as StoredState;
    // A cooldown that's already elapsed resets the counter too — a fresh window, not a leftover count.
    if (parsed.cooldownUntil && parsed.cooldownUntil <= Date.now()) return { attempts: 0, cooldownUntil: null };
    return parsed;
  } catch {
    return { attempts: 0, cooldownUntil: null };
  }
}

function writeState(key: string, state: StoredState) {
  window.sessionStorage.setItem(key, JSON.stringify(state));
}

/**
 * Client-side attempt/cooldown tracking for the password-recovery forms
 * (unified login and the Coach Portal's own) — up to 8 sends per browser
 * session before a 15-minute cooldown, with the remaining count and a
 * live countdown always visible, so a user never hits a silent dead end.
 * This is a proactive UX guard, not the real security boundary — Supabase
 * enforces its own server-side send rate limit regardless (surfaced via
 * lib/auth-rate-limit.ts's classifyResetError), and `serverRateLimited`
 * lets a caller fold that authoritative signal into the same cooldown if
 * it ever fires before this client-side count reaches 8.
 */
export function usePasswordResetAttempts(scopeKey: string, serverRateLimited: boolean) {
  const storageKey = `ggsp-pw-reset-attempts:${scopeKey}`;
  const [state, setState] = useState<StoredState>(() => readState(storageKey));
  const [now, setNow] = useState(() => Date.now());

  useEffect(() => {
    if (serverRateLimited) {
      const next = { attempts: MAX_ATTEMPTS, cooldownUntil: Date.now() + COOLDOWN_MS };
      writeState(storageKey, next);
      setState(next);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [serverRateLimited]);

  useEffect(() => {
    if (!state.cooldownUntil) return;
    const interval = setInterval(() => setNow(Date.now()), 1000);
    return () => clearInterval(interval);
  }, [state.cooldownUntil]);

  const isCoolingDown = !!state.cooldownUntil && state.cooldownUntil > now;
  const cooldownSecondsRemaining = isCoolingDown ? Math.ceil((state.cooldownUntil! - now) / 1000) : 0;

  function recordAttempt() {
    const attempts = state.attempts + 1;
    const next: StoredState = attempts >= MAX_ATTEMPTS ? { attempts, cooldownUntil: Date.now() + COOLDOWN_MS } : { attempts, cooldownUntil: null };
    writeState(storageKey, next);
    setState(next);
  }

  return {
    maxAttempts: MAX_ATTEMPTS,
    attemptsUsed: Math.min(state.attempts, MAX_ATTEMPTS),
    attemptsRemaining: Math.max(0, MAX_ATTEMPTS - state.attempts),
    isCoolingDown,
    cooldownSecondsRemaining,
    recordAttempt,
  };
}
