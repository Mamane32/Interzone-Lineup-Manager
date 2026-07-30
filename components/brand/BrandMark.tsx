import Link from "next/link";

export default function BrandMark({
  compact = false,
  href = "/",
  className = "",
}: {
  compact?: boolean;
  href?: string;
  className?: string;
}) {
  return (
    <Link href={href} className={`inline-flex items-center gap-3 ${className}`} aria-label="GoodGrafik Sports Platform">
      <span className="relative flex h-10 w-10 items-center justify-center overflow-hidden rounded-xl bg-brand-400 text-surface-950 shadow-glow">
        <span className="font-display text-lg font-bold tracking-[-0.08em]">GG</span>
        <span className="absolute bottom-0 left-0 h-1 w-full bg-white/60" />
      </span>
      {!compact && (
        <span className="leading-none">
          <span className="block font-display text-base font-semibold tracking-wide text-white">GoodGrafik</span>
          <span className="mt-1 block text-[9px] font-semibold uppercase tracking-[0.24em] text-white/40">
            Sports Platform
          </span>
        </span>
      )}
    </Link>
  );
}
