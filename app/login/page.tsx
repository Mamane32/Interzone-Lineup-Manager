import { ShieldCheck } from "lucide-react";
import LoginForm from "@/components/auth/LoginForm";
import { getBaseBranding } from "@/lib/branding";

export const dynamic = "force-dynamic";

export default function UnifiedLoginPage({ searchParams }: { searchParams: { error?: string } }) {
  const branding = getBaseBranding();

  return (
    <main className="relative flex min-h-screen items-center justify-center overflow-hidden bg-[#05070a] px-4 py-12">
      <div className="pointer-events-none absolute inset-0 bg-[radial-gradient(circle_at_50%_0%,rgba(255,255,255,0.05),transparent_60%)]" />

      <div className="relative w-full max-w-sm">
        <div className="mb-8 text-center">
          <p className="flex items-center justify-center gap-1.5 text-xs uppercase tracking-[0.2em] text-white/40">
            <ShieldCheck size={14} /> Portal Login
          </p>
          <h1 className="mt-2 font-display text-2xl font-semibold text-white">{branding.organizationName}</h1>
          <p className="mt-1 text-sm text-white/40">Sign in to your workspace</p>
        </div>

        <div className="rounded-2xl border border-white/10 bg-white/[0.03] p-6 shadow-[0_20px_60px_-15px_rgba(0,0,0,0.6)]">
          <LoginForm errorCode={searchParams.error} />
        </div>

        <p className="mt-6 text-center text-xs text-white/25">
          Powered by <span className="font-semibold text-white/40">{branding.poweredByName}</span>
        </p>
      </div>
    </main>
  );
}
