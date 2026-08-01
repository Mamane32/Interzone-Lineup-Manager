"use client";

import { Mail, Clock } from "lucide-react";
import Button from "@/components/ui/Button";
import { usePasswordResetAttempts } from "./usePasswordResetAttempts";

const ERROR_COPY: Record<string, string> = {
  rate_limited: "You've requested a reset recently — please wait before trying again.",
  failed: "Something went wrong sending that email. Please try again in a moment.",
};

function formatCountdown(seconds: number): string {
  const m = Math.floor(seconds / 60);
  const s = seconds % 60;
  return `${m}:${String(s).padStart(2, "0")}`;
}

export default function ForgotPasswordForm({ action, error }: { action: (formData: FormData) => void; error?: string }) {
  const { maxAttempts, attemptsRemaining, isCoolingDown, cooldownSecondsRemaining, recordAttempt } = usePasswordResetAttempts(
    "unified-login",
    error === "rate_limited"
  );

  return (
    <form
      action={action}
      onSubmit={(e) => {
        if (isCoolingDown) {
          e.preventDefault();
          return;
        }
        recordAttempt();
      }}
      className="flex flex-col gap-5"
    >
      <label className="flex flex-col gap-2">
        <span className="text-sm font-medium text-white/70">Email address</span>
        <span className="flex items-center gap-3 rounded-xl border border-white/10 bg-white/[0.035] px-3 transition focus-within:border-brand-400/45 focus-within:bg-white/[0.05]">
          <Mail size={17} className="text-white/30" aria-hidden="true" />
          <input
            name="email"
            type="email"
            autoComplete="email"
            required
            disabled={isCoolingDown}
            placeholder="name@organization.com"
            className="min-w-0 flex-1 bg-transparent py-3.5 text-sm text-white placeholder:text-white/25 focus:outline-none disabled:opacity-50"
          />
        </span>
      </label>

      {error && (
        <p className="rounded-lg bg-status-correction/10 px-3 py-2 text-sm font-medium text-status-correction">{ERROR_COPY[error] ?? "Something went wrong."}</p>
      )}

      {isCoolingDown ? (
        <p className="flex items-center gap-1.5 text-xs text-white/40">
          <Clock size={13} /> Too many attempts — try again in {formatCountdown(cooldownSecondsRemaining)}.
        </p>
      ) : (
        <p className="text-xs text-white/30">
          {attemptsRemaining} of {maxAttempts} attempts remaining this session.
        </p>
      )}

      <Button type="submit" size="lg" className="w-full" disabled={isCoolingDown}>
        {isCoolingDown ? "Please wait…" : "Send recovery link"}
      </Button>
    </form>
  );
}
