import type { LucideIcon } from "lucide-react";

export default function StatCard({ label, value, detail, icon: Icon, tone = "brand" }: { label: string; value: string | number; detail?: string; icon: LucideIcon; tone?: "brand" | "success" | "neutral" }) {
  const tones = {
    brand: "border-brand-400/15 bg-brand-400/[0.07] text-brand-400",
    success: "border-emerald-400/15 bg-emerald-400/[0.07] text-emerald-300",
    neutral: "border-white/[0.08] bg-white/[0.035] text-white/50",
  };
  return (
    <div className="surface-panel p-5 hover:-translate-y-1 hover:border-white/[0.16] hover:shadow-[0_28px_70px_-24px_rgba(0,0,0,0.75)]">
      <div className="flex items-start justify-between">
        <div>
          <p className="text-xs font-medium text-white/40">{label}</p>
          <p className="mt-3 font-display text-3xl font-semibold">{value}</p>
          {detail && <p className="mt-1 text-[11px] text-white/30">{detail}</p>}
        </div>
        <span className={`flex h-10 w-10 items-center justify-center rounded-xl border ${tones[tone]}`}><Icon size={18} /></span>
      </div>
    </div>
  );
}
