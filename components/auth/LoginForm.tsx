"use client";

import { useState, useTransition } from "react";
import Link from "next/link";
import { Mail, Lock, Eye, EyeOff } from "lucide-react";
import Button from "@/components/ui/Button";
import { unifiedLogin } from "@/app/login/actions";

const ERRORS: Record<string, string> = {
  invalid: "Unable to sign in with those credentials.",
  "no-profile": "Your account is authenticated, but it has not yet been assigned access. Please contact an administrator.",
  "inactive-profile": "Your account is not currently active. Please contact an administrator.",
  "no-assignments": "Your account is authenticated, but it has not yet been assigned access. Please contact an administrator.",
  "no-access": "Your account does not have access to that area. Please contact an administrator.",
};

export default function LoginForm({ errorCode }: { errorCode?: string }) {
  const [showPassword, setShowPassword] = useState(false);
  const [pending, startTransition] = useTransition();
  const [clientError, setClientError] = useState<string | null>(null);

  const errorMessage = clientError ?? (errorCode ? ERRORS[errorCode] ?? "Something went wrong. Please try again." : null);

  function handleSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setClientError(null);
    const form = e.currentTarget;
    const email = (form.elements.namedItem("email") as HTMLInputElement).value.trim();
    const password = (form.elements.namedItem("password") as HTMLInputElement).value;

    if (!email || !password) {
      setClientError("Enter your email and password to continue.");
      return;
    }

    const fd = new FormData(form);
    startTransition(() => {
      unifiedLogin(fd);
    });
  }

  return (
    <form onSubmit={handleSubmit} noValidate className="flex flex-col gap-4">
      <label className="flex flex-col gap-1.5">
        <span className="text-sm font-medium text-white/60">Email</span>
        <span className="flex items-center gap-2 rounded-xl border border-white/10 bg-white/5 px-3 focus-within:border-white/30">
          <Mail size={16} className="text-white/30" />
          <input
            name="email"
            type="email"
            autoComplete="email"
            required
            aria-required="true"
            placeholder="you@example.com"
            className="h-12 flex-1 bg-transparent text-white placeholder:text-white/25 focus:outline-none"
          />
        </span>
      </label>

      <label className="flex flex-col gap-1.5">
        <span className="text-sm font-medium text-white/60">Password</span>
        <span className="flex items-center gap-2 rounded-xl border border-white/10 bg-white/5 px-3 focus-within:border-white/30">
          <Lock size={16} className="text-white/30" />
          <input
            name="password"
            type={showPassword ? "text" : "password"}
            autoComplete="current-password"
            required
            aria-required="true"
            placeholder="••••••••"
            className="h-12 flex-1 bg-transparent text-white placeholder:text-white/25 focus:outline-none"
          />
          <button
            type="button"
            onClick={() => setShowPassword((v) => !v)}
            aria-label={showPassword ? "Hide password" : "Show password"}
            aria-pressed={showPassword}
            className="flex h-8 w-8 flex-none items-center justify-center rounded-lg text-white/40 hover:text-white"
          >
            {showPassword ? <EyeOff size={16} /> : <Eye size={16} />}
          </button>
        </span>
      </label>

      {errorMessage && (
        <p role="alert" className="rounded-lg bg-red-500/10 px-3 py-2 text-sm font-medium text-red-400">
          {errorMessage}
        </p>
      )}

      <Button type="submit" size="lg" disabled={pending} className="mt-1 w-full">
        {pending ? "Signing in..." : "Sign in"}
      </Button>

      <Link href="/login/forgot-password" className="text-center text-sm text-white/40 hover:text-white">
        Forgot your password?
      </Link>
    </form>
  );
}
