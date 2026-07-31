import Link from "next/link";

/**
 * The GGSP crest — a heraldic shield silhouette (pure CSS clip-path, no
 * asset), not a rounded-square app icon. Sports federations and clubs are
 * recognized by crests, not by generic SaaS logo marks; this is the one
 * shape in the whole design system deliberately built to say "football
 * federation," not "software product."
 */
export default function BrandMark({
  compact = false,
  href = "/",
  className = "",
  size = "md",
}: {
  compact?: boolean;
  href?: string;
  className?: string;
  size?: "sm" | "md" | "lg";
}) {
  const dims = { sm: "h-9 w-8", md: "h-11 w-10", lg: "h-16 w-14" }[size];
  const glyph = { sm: "text-sm", md: "text-base", lg: "text-2xl" }[size];

  return (
    <Link href={href} className={`group inline-flex items-center gap-3 ${className}`} aria-label="GoodGrafik Sports Platform">
      <span
        className={`relative flex flex-none items-center justify-center bg-gradient-to-b from-brand-100 via-brand-400 to-brand-600 text-surface-950 shadow-glow transition-transform duration-200 group-hover:scale-105 ${dims}`}
        style={{ clipPath: "polygon(0% 0%, 100% 0%, 100% 60%, 50% 100%, 0% 60%)" }}
      >
        <span className="absolute inset-x-0 top-0 h-[45%] bg-white/25" style={{ clipPath: "polygon(0% 0%, 100% 0%, 100% 100%, 0% 100%)" }} />
        <span className={`relative -translate-y-0.5 font-display font-black tracking-[-0.06em] ${glyph}`}>GG</span>
      </span>
      {!compact && (
        <span className="leading-none">
          <span className="block font-display text-lg font-bold tracking-tight text-white">
            GoodGrafik<span className="text-brand-400">.</span>
          </span>
          <span className="mt-1 flex items-center gap-1.5 text-[9px] font-bold uppercase tracking-[0.28em] text-white/40">
            <span className="h-1 w-1 rounded-full bg-brand-400" />
            Sports Platform
          </span>
        </span>
      )}
    </Link>
  );
}
