"use client";

import { Mail, Clock } from "lucide-react";
import Button from "@/components/ui/Button";
import { usePasswordResetAttempts } from "./usePasswordResetAttempts";

const ERROR_COPY: Record<string, string> = {
  rate_limited: "Ou mande yon lyen twò souvan — tanpri tann yon ti moman anvan w eseye ankò.",
  failed: "Nou pa t kapab voye imèl la. Tanpri eseye ankò nan yon ti moman.",
};

function formatCountdown(seconds: number): string {
  const m = Math.floor(seconds / 60);
  const s = seconds % 60;
  return `${m}:${String(s).padStart(2, "0")}`;
}

export default function CoachForgotPasswordForm({
  action,
  error,
  scopeKey,
}: {
  action: (formData: FormData) => void;
  error?: string;
  scopeKey: string;
}) {
  const { maxAttempts, attemptsRemaining, isCoolingDown, cooldownSecondsRemaining, recordAttempt } = usePasswordResetAttempts(
    scopeKey,
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
      className="flex flex-col gap-4"
    >
      <label className="flex flex-col gap-1.5">
        <span className="text-sm font-medium text-ink-muted">Imèl</span>
        <span className="flex items-center gap-2 rounded-xl border border-ink-line bg-ink px-3 focus-within:border-amber-signal">
          <Mail size={16} className="text-ink-muted" />
          <input
            name="email"
            type="email"
            required
            disabled={isCoolingDown}
            placeholder="antrenè@ekip.ht"
            className="h-12 flex-1 bg-transparent text-white placeholder:text-ink-muted focus:outline-none disabled:opacity-50"
          />
        </span>
      </label>

      {error && <p className="rounded-lg bg-status-correction/10 px-3 py-2 text-sm font-medium text-status-correction">{ERROR_COPY[error] ?? "Gen yon erè."}</p>}

      {isCoolingDown ? (
        <p className="flex items-center gap-1.5 text-xs text-ink-muted">
          <Clock size={13} /> Twòp tantativ — eseye ankò nan {formatCountdown(cooldownSecondsRemaining)}.
        </p>
      ) : (
        <p className="text-xs text-ink-muted">
          {attemptsRemaining} sou {maxAttempts} tantativ ki rete pou sesyon sa a.
        </p>
      )}

      <Button type="submit" size="lg" className="w-full" disabled={isCoolingDown}>
        {isCoolingDown ? "Tann..." : "Voye lyen"}
      </Button>
    </form>
  );
}
