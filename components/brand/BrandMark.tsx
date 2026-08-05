import Link from "next/link";
import Image from "next/image";

/**
 * The GGSP crest — a heraldic shield silhouette (pure CSS clip-path, no
 * asset), not a rounded-square app icon. Sports federations and clubs are
 * recognized by crests, not by generic SaaS logo marks; this is the one
 * shape in the whole design system deliberately built to say "football
 * federation," not "software product." Falls back to this crest even when
 * a custom `logoUrl` is configured — see `logoUrl` below.
 *
 * `orgName`/`subtitle`/`logoUrl` default to the platform's own long-running
 * identity so every existing call site keeps rendering exactly as before
 * without changes. Pages that show the platform's own header (the admin/
 * coach shell, the Broadcast Control Center's GG header, the unified
 * login) should instead pass these from `lib/branding.ts`'s
 * `getPlatformBranding()` — the admin-editable source of truth
 * (Settings → Platform branding) — so renaming the platform or swapping
 * its logo never requires a code change.
 */
export default function BrandMark({
  compact = false,
  href = "/",
  className = "",
  size = "md",
  orgName = "GoodGrafik",
  subtitle = "Sports Platform",
  logoUrl = null,
}: {
  compact?: boolean;
  href?: string;
  className?: string;
  size?: "sm" | "md" | "lg";
  /** Organization name, shown in white next to the crest. */
  orgName?: string;
  /** Small gold uppercase line under the org name. */
  subtitle?: string;
  /** When set, renders in place of the CSS crest — an uploaded logo
   * (Settings → Platform branding) takes priority over the built-in
   * shield. Still falls back to the crest if this fails to load isn't
   * provided. */
  logoUrl?: string | null;
}) {
  const dims = { sm: "h-9 w-8", md: "h-11 w-10", lg: "h-16 w-14" }[size];
  const glyph = { sm: "text-sm", md: "text-base", lg: "text-2xl" }[size];
  const pixelSize = { sm: 36, md: 44, lg: 64 }[size];

  return (
    <Link href={href} className={`group inline-flex items-center gap-3 ${className}`} aria-label={`${orgName} ${subtitle}`}>
      {logoUrl ? (
        <span className={`relative flex flex-none items-center justify-center overflow-hidden rounded-xl transition-transform duration-200 group-hover:scale-105 ${dims}`}>
          <Image src={logoUrl} alt="" fill sizes={`${pixelSize}px`} className="object-contain" />
        </span>
      ) : (
        <span
          className={`relative flex flex-none items-center justify-center bg-gradient-to-b from-brand-100 via-brand-400 to-brand-600 text-surface-950 shadow-glow transition-transform duration-200 group-hover:scale-105 ${dims}`}
          style={{ clipPath: "polygon(0% 0%, 100% 0%, 100% 60%, 50% 100%, 0% 60%)" }}
        >
          <span className="absolute inset-x-0 top-0 h-[45%] bg-white/25" style={{ clipPath: "polygon(0% 0%, 100% 0%, 100% 100%, 0% 100%)" }} />
          <span className={`relative -translate-y-0.5 font-display font-black tracking-[-0.06em] ${glyph}`}>GG</span>
        </span>
      )}
      {!compact && (
        <span className="leading-none">
          <span className="block font-display text-lg font-bold tracking-tight text-white">
            {orgName}
            <span className="text-brand-400">.</span>
          </span>
          <span className="mt-1 flex items-center gap-1.5 text-[9px] font-bold uppercase tracking-[0.28em] text-white/40">
            <span className="h-1 w-1 rounded-full bg-brand-400" />
            {subtitle}
          </span>
        </span>
      )}
    </Link>
  );
}
