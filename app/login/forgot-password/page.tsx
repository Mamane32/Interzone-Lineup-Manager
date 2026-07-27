import Link from "next/link";
import { Mail, ArrowLeft } from "lucide-react";
import Button from "@/components/ui/Button";
import { getBaseBranding } from "@/lib/branding";
import { requestUnifiedPasswordReset } from "../actions";

export const dynamic = "force-dynamic";

export default function ForgotPasswordPage({ searchParams }: { searchParams: { sent?: string } }) {
  const branding = getBaseBranding();

  return (
    <main className="flex min-h-screen items-center justify-center bg-[#05070a] px-4">
      <div className="w-full max-w-sm">
        <Link href="/login" className="mb-6 inline-flex items-center gap-1 text-sm text-white/40 hover:text-white">
          <ArrowLeft size={14} /> Back to sign in
        </Link>

        <div className="rounded-2xl border border-white/10 bg-white/[0.03] p-6 shadow-[0_20px_60px_-15px_rgba(0,0,0,0.6)]">
          {searchParams.sent ? (
            <div className="text-center">
              <p className="font-display text-lg font-semibold text-white">Check your email</p>
              <p className="mt-2 text-sm text-white/40">
                If that address has an account, we&apos;ve sent a link to reset your password.
              </p>
            </div>
          ) : (
            <form action={requestUnifiedPasswordReset} className="flex flex-col gap-4">
              <div>
                <p className="font-display text-lg font-semibold text-white">Reset your password</p>
                <p className="mt-1 text-sm text-white/40">{branding.organizationName}</p>
              </div>
              <label className="flex flex-col gap-1.5">
                <span className="text-sm font-medium text-white/60">Email</span>
                <span className="flex items-center gap-2 rounded-xl border border-white/10 bg-white/5 px-3 focus-within:border-white/30">
                  <Mail size={16} className="text-white/30" />
                  <input
                    name="email"
                    type="email"
                    autoComplete="email"
                    required
                    placeholder="you@example.com"
                    className="h-12 flex-1 bg-transparent text-white placeholder:text-white/25 focus:outline-none"
                  />
                </span>
              </label>
              <Button type="submit" size="lg" className="w-full">
                Send reset link
              </Button>
            </form>
          )}
        </div>
      </div>
    </main>
  );
}
