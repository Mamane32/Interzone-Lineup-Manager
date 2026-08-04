import Link from "next/link";
import { ArrowRight, MailCheck } from "lucide-react";
import AuthFrame from "@/components/auth/AuthFrame";

export default function InvitationPage() {
  return (
    <AuthFrame eyebrow="Workspace invitation" title="Your place in the operation starts here" description="GoodGrafik invitations are tied to your email and assigned workspace. Open the secure link in your invitation email to finish setup." backHref="/login">
      <div className="text-center">
        <span className="mx-auto flex h-14 w-14 items-center justify-center rounded-2xl border border-brand-400/20 bg-brand-400/[0.08] text-brand-400"><MailCheck size={25} /></span>
        <h2 className="mt-5 font-display text-xl font-semibold">Check your invitation email</h2>
        <p className="mt-2 text-sm leading-6 text-white/40">Invitation links are unique and expire for your protection. If yours has expired, contact your organization administrator.</p>
        <Link href="/login" className="mt-6 inline-flex h-11 items-center gap-2 rounded-xl bg-brand-400 px-5 text-sm font-semibold text-surface-950 transition hover:bg-brand-100">Go to sign in <ArrowRight size={15} /></Link>
      </div>
    </AuthFrame>
  );
}
