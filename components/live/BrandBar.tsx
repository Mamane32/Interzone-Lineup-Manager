import Image from "next/image";
import type { BrandingConfiguration } from "@/lib/branding";

/**
 * League → Competition → (match, rendered by the caller) — the identity
 * hierarchy the Broadcast Center should communicate immediately, per the
 * Phase 4 branding review. Both logos are real data (organizations.logo_url
 * / competitions.logo_url), not placeholders; either can be absent (a
 * competition with no logo, or no organization at all) without breaking
 * the layout — this renders whatever's actually on file, nothing invented.
 */
export default function BrandBar({ branding, compact = false }: { branding: BrandingConfiguration; compact?: boolean }) {
  const hasLeague = !!branding.organizationName && branding.organizationName !== "Broadcast Control Center";

  return (
    <div className={compact ? "flex items-center gap-2.5" : "flex flex-col gap-1.5"}>
      <div className={compact ? "flex items-center gap-2" : "flex items-center gap-2.5"}>
        {branding.organizationLogoUrl && (
          <Image
            src={branding.organizationLogoUrl}
            alt=""
            width={compact ? 20 : 26}
            height={compact ? 20 : 26}
            className={`${compact ? "h-5 w-5" : "h-[26px] w-[26px]"} flex-none rounded-full object-cover ring-1 ring-white/15`}
            unoptimized
          />
        )}
        {branding.competitionLogoUrl && (
          <Image
            src={branding.competitionLogoUrl}
            alt=""
            width={compact ? 20 : 26}
            height={compact ? 20 : 26}
            className={`${compact ? "h-5 w-5" : "h-[26px] w-[26px]"} flex-none rounded-full object-cover ring-1 ring-white/15`}
            unoptimized
          />
        )}
        <div className="min-w-0 leading-tight">
          {hasLeague && (
            <p className="truncate text-[10px] font-semibold uppercase tracking-wide text-white/40">{branding.organizationName}</p>
          )}
          <p className={compact ? "truncate font-display text-sm font-semibold text-white" : "truncate font-display text-lg font-semibold text-white"}>
            {branding.competitionName || (hasLeague ? "" : branding.organizationName)}
          </p>
        </div>
      </div>

      <div className="flex flex-wrap items-center gap-x-2 gap-y-0.5 text-[10px] text-white/35">
        {branding.productionPartnerName && (
          <span>
            Production Partner: <span className="text-white/55">{branding.productionPartnerName}</span>
          </span>
        )}
        <span className={branding.productionPartnerName ? "before:mr-2 before:content-['·']" : ""}>
          Powered by <span className="font-semibold text-white/55">{branding.poweredByName}</span>
        </span>
      </div>
    </div>
  );
}
