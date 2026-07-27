import type { BrandingConfiguration } from "@/lib/branding";

export default function BrandBar({ branding, compact = false }: { branding: BrandingConfiguration; compact?: boolean }) {
  const title = branding.competitionName || branding.organizationName;

  return (
    <div className={compact ? "flex items-center gap-2" : "flex flex-col gap-0.5"}>
      <p className={compact ? "font-display text-sm font-semibold text-white" : "font-display text-lg font-semibold text-white"}>
        {title}
      </p>
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
