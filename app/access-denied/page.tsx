import Link from "next/link";
import { ArrowLeft, ShieldX } from "lucide-react";
import AuthFrame from "@/components/auth/AuthFrame";

export default function AccessDeniedPage() {
  return (
    <AuthFrame eyebrow="Access restricted" title="This workspace isn’t assigned to you" description="Your identity is valid, but your current role doesn’t include access to this area." backHref="/select-workspace">
      <div className="text-center">
        <span className="mx-auto flex h-14 w-14 items-center justify-center rounded-2xl border border-red-400/20 bg-red-400/[0.07] text-red-300"><ShieldX size={25} /></span>
        <p className="mt-5 text-sm leading-6 text-white/45">Choose another assigned workspace or ask an administrator to review your access.</p>
        <Link href="/select-workspace" className="mt-6 inline-flex h-11 items-center gap-2 rounded-xl border border-white/10 bg-white/[0.04] px-5 text-sm font-semibold transition hover:bg-white/[0.08]"><ArrowLeft size={15} /> Return to workspaces</Link>
      </div>
    </AuthFrame>
  );
}
