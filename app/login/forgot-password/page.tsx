import { CheckCircle2 } from "lucide-react";
import AuthFrame from "@/components/auth/AuthFrame";
import ForgotPasswordForm from "@/components/auth/ForgotPasswordForm";
import { requestUnifiedPasswordReset } from "../actions";

export const dynamic = "force-dynamic";

export default function ForgotPasswordPage({ searchParams }: { searchParams: { sent?: string; error?: string } }) {
  return (
    <AuthFrame
      eyebrow="Account recovery"
      title={searchParams.sent ? "Check your inbox" : "Reset your password"}
      description={
        searchParams.sent
          ? "If an account matches that address, a secure recovery link is on its way."
          : "Enter the email attached to your GoodGrafik identity and we’ll send a secure recovery link."
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
        <ForgotPasswordForm action={requestUnifiedPasswordReset} error={searchParams.error} />
      )}
    </AuthFrame>
  );
}
