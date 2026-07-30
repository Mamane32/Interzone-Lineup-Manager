import Link from "next/link";
import { ArrowRight, Inbox, type LucideIcon } from "lucide-react";

export default function EmptyState({
  title,
  description,
  action,
  icon: Icon = Inbox,
  compact = false,
}: {
  title: string;
  description: string;
  action?: { href: string; label: string };
  icon?: LucideIcon;
  compact?: boolean;
}) {
  return (
    <div className={`surface-panel flex flex-col items-center justify-center px-6 text-center ${compact ? "min-h-56 py-10" : "min-h-[420px] py-16"}`}>
      <span className="flex h-14 w-14 items-center justify-center rounded-2xl border border-white/[0.08] bg-white/[0.035] text-white/35"><Icon size={23} /></span>
      <h2 className="mt-5 font-display text-2xl font-semibold">{title}</h2>
      <p className="mt-2 max-w-md text-sm leading-6 text-white/40">{description}</p>
      {action && <Link href={action.href} className="mt-6 inline-flex h-11 items-center gap-2 rounded-xl bg-brand-400 px-5 text-sm font-semibold text-surface-950 transition hover:bg-brand-100">{action.label} <ArrowRight size={15} /></Link>}
    </div>
  );
}
