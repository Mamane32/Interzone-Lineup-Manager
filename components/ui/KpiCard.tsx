import { ArrowDownRight, ArrowUpRight, Minus, type LucideIcon } from "lucide-react";
import Sparkline from "@/components/ui/Sparkline";

export default function KpiCard({
  label,
  value,
  detail,
  icon: Icon,
  trend,
  sparkline,
  tone = "brand",
}: {
  label: string;
  value: string | number;
  detail?: string;
  icon: LucideIcon;
  /** Percentage change vs. the prior comparable window. Omit if there's no baseline to compare against. */
  trend?: number;
  sparkline?: number[];
  tone?: "brand" | "success" | "warning" | "neutral";
}) {
  const tones = {
    brand: "border-brand-400/15 bg-brand-400/[0.07] text-brand-400",
    success: "border-emerald-400/15 bg-emerald-400/[0.07] text-emerald-300",
    warning: "border-status-waiting/15 bg-status-waiting/[0.07] text-status-waiting",
    neutral: "border-white/[0.08] bg-white/[0.035] text-white/50",
  };

  const trendTone =
    trend === undefined || trend === 0
      ? { icon: Minus, className: "bg-white/5 text-white/40" }
      : trend > 0
        ? { icon: ArrowUpRight, className: "bg-emerald-400/10 text-emerald-300" }
        : { icon: ArrowDownRight, className: "bg-status-correction/10 text-status-correction" };

  return (
    <div className="surface-panel p-5 hover:-translate-y-1 hover:border-white/[0.16] hover:shadow-[0_28px_70px_-24px_rgba(0,0,0,0.75)]">
      <div className="flex items-start justify-between">
        <span className={`flex h-10 w-10 items-center justify-center rounded-xl border ${tones[tone]}`}>
          <Icon size={18} />
        </span>
        {trend !== undefined && (
          <span className={`inline-flex items-center gap-1 rounded-full px-2 py-0.5 text-[11px] font-semibold ${trendTone.className}`}>
            <trendTone.icon size={11} />
            {Math.abs(trend)}%
          </span>
        )}
      </div>
      <p className="mt-4 text-xs font-medium text-white/40">{label}</p>
      <p className="mt-1 font-display text-3xl font-semibold">{value}</p>
      {sparkline && sparkline.length > 1 && (
        <div className="mt-3">
          <Sparkline values={sparkline} />
        </div>
      )}
      {detail && <p className="mt-1 text-[11px] text-white/30">{detail}</p>}
    </div>
  );
}
