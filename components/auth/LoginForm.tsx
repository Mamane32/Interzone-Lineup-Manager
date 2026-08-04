"use client";

import { useState, useTransition } from "react";
import Link from "next/link";
import { ArrowRight, Eye, EyeOff, Lock, Mail } from "lucide-react";
import Button from "@/components/ui/Button";
import { unifiedLogin } from "@/app/login/actions";

const ERRORS: Record<string, string> = {
  invalid: "Unable to sign in with those credentials.",
  "no-profile": "Your account is authenticated, but it has not yet been assigned access. Please contact an administrator.",
  "inactive-profile": "Your account is not currently active. Please contact an administrator.",
  "no-assignments": "Your account is authenticated, but it has not yet been assigned access. Please contact an administrator.",
  "no-access": "Your account does not have access to that area. Please contact an administrator.",
  "signin-exception": "Something went wrong contacting the authentication service. Please try again. (ref: signin)",
  "resolve-exception": "Something went wrong loading your account. Please try again. (ref: resolve)",
};

export default function LoginForm({ errorCode }: { errorCode?: string }) {
  const [showPassword, setShowPassword] = useState(false);
  const [pending, startTransition] = useTransition();
  const [clientError, setClientError] = useState<string | null>(null);
  const errorMessage =
    clientError ??
    (errorCode
      ? ERRORS[errorCode] ??
        (errorCode.startsWith("resolve-exception-")
          ? `Something went wrong loading your account. Please try again. (ref: ${errorCode})`
          : "Something went wrong. Please try again.")
      : null);

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
    startTransition(() => unifiedLogin(fd));
  }

  return (
    <form onSubmit={handleSubmit} noValidate className="flex flex-col gap-5">
      <label className="flex flex-col gap-2">
        <span className="text-sm font-medium text-white/70">Email address</span>
        <span className="flex items-center gap-3 rounded-xl border border-white/10 bg-white/[0.035] px-3 transition focus-within:border-brand-400/45 focus-within:bg-white/[0.05]">
          <Mail size={17} className="text-white/30" aria-hidden="true" />
          <input name="email" type="email" autoComplete="email" required aria-required="true" placeholder="name@organization.com" className="min-w-0 flex-1 bg-transparent py-3.5 text-sm text-white placeholder:text-white/25 focus:outline-none" />
        </span>
      </label>
      <label className="flex flex-col gap-2">
        <span className="flex items-center justify-between">
          <span className="text-sm font-medium text-white/70">Password</span>
          <Link href="/login/forgot-password" className="text-xs font-medium text-brand-400 transition hover:text-brand-100">Forgot password?</Link>
        </span>
        <span className="flex items-center gap-3 rounded-xl border border-white/10 bg-white/[0.035] px-3 transition focus-within:border-brand-400/45 focus-within:bg-white/[0.05]">
          <Lock size={17} className="text-white/30" aria-hidden="true" />
          <input name="password" type={showPassword ? "text" : "password"} autoComplete="current-password" required aria-required="true" placeholder="••••••••" className="min-w-0 flex-1 bg-transparent py-3.5 text-sm text-white placeholder:text-white/25 focus:outline-none" />
          <button type="button" onClick={() => setShowPassword((value) => !value)} aria-label={showPassword ? "Hide password" : "Show password"} aria-pressed={showPassword} className="flex h-9 w-9 flex-none items-center justify-center rounded-lg text-white/35 transition hover:bg-white/5 hover:text-white">
            {showPassword ? <EyeOff size={16} /> : <Eye size={16} />}
          </button>
        </span>
      </label>
      {errorMessage && <p role="alert" className="rounded-xl border border-red-400/15 bg-red-400/[0.07] px-3 py-2.5 text-sm font-medium text-red-300">{errorMessage}</p>}
      <Button type="submit" size="lg" disabled={pending} className="mt-1 w-full">
        {pending ? "Signing in..." : <>Sign in securely <ArrowRight size={17} /></>}
      </Button>
      <p className="text-center text-xs leading-5 text-white/30">By continuing, you agree to your organization&apos;s access and security policies.</p>
    </form>
  );
}
