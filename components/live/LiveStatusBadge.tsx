const TONE_STYLE: Record<string, string> = {
  positive: "bg-emerald-500/15 text-emerald-400",
  live: "bg-red-500/15 text-red-400",
  warning: "bg-amber-signal/15 text-amber-signal",
  neutral: "bg-white/8 text-white/45",
  negative: "bg-white/5 text-white/25",
};

export type BadgeTone = keyof typeof TONE_STYLE;

export default function LiveStatusBadge({
  label,
  tone,
  pulse = false,
}: {
  label: string;
  tone: BadgeTone;
  pulse?: boolean;
}) {
  return (
    <span
      className={`inline-flex items-center gap-1.5 rounded-full px-2.5 py-1 text-[10px] font-bold uppercase tracking-wide ${TONE_STYLE[tone]}`}
    >
      <span className={`h-1.5 w-1.5 rounded-full bg-current ${pulse ? "animate-pulse" : ""}`} />
      {label}
    </span>
  );
}
