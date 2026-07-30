import { CheckCircle2, Mail } from "lucide-react";
import AuthFrame from "@/components/auth/AuthFrame";
import Button from "@/components/ui/Button";
import { requestUnifiedPasswordReset } from "../actions";

export const dynamic = "force-dynamic";

export default function ForgotPasswordPage({ searchParams }: { searchParams: { sent?: string } }) {
  return (
    <AuthFrame
      eyebrow="Account recovery"
      title={searchParams.sent ? "Check your inbox" : "Reset your password"}
      description={
        searchParams.sent
          ? "If an account matches that address, a secure recovery link is on its way."
          : "Enter the email attached to your GGSP identity and we’ll send a secure recovery link."
      }
      backHref="/login"
    >
      {searchParams.sent ? (
        <div className="py-3 text-center">
          <span className="mx-auto flex h-14 w-14 items-center justify-center rounded-2xl border border-emerald-400/20 bg-emerald-400/[0.08] text-emerald-300">
            <CheckCircle2 size={25} />
          </span>
          <p className="mt-5 text-sm leading-6 text-white/45">
            For your security, we don&apos;t confirm whether an account exists. Check your inbox and spam folder.
          </p>
        </div>
      ) : (
        <form action={requestUnifiedPasswordReset} className="flex flex-col gap-5">
          <label className="flex flex-col gap-2">
            <span className="text-sm font-medium text-white/70">Email address</span>
            <span className="flex items-center gap-3 rounded-xl border border-white/10 bg-white/[0.035] px-3 transition focus-within:border-brand-400/45 focus-within:bg-white/[0.05]">
              <Mail size={17} className="text-white/30" aria-hidden="true" />
              <input
                name="email"
                type="email"
                autoComplete="email"
                required
                placeholder="name@organization.com"
                className="min-w-0 flex-1 bg-transparent py-3.5 text-sm text-white placeholder:text-white/25 focus:outline-none"
              />
            </span>
          </label>
          <Button type="submit" size="lg" className="w-full">Send recovery link</Button>
        </form>
      )}
    </AuthFrame>
  );
}
