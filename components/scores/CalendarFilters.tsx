"use client";

import { useRouter, usePathname, useSearchParams } from "next/navigation";
import type { PublicCompetitionOption } from "@/lib/public-scores";
import type { PublicGroup } from "@/lib/public-groups";

/**
 * Match Calendar's Team/Competition/Group filter bar — native <select>
 * elements restyled to match GGScoreLive's own dark/rounded visual
 * language rather than importing components/ui/Select.tsx (that
 * component's tone styling is built for the admin console; every public
 * page here builds its own minimal presentation instead, same precedent
 * app/match/[matchId]/page.tsx's doc comment already establishes). A
 * client component since changing a filter needs to update the URL
 * without a full navigation away from the page's current scroll position.
 */
export default function CalendarFilters({
  competitions,
  groups,
  teamNames,
}: {
  competitions: PublicCompetitionOption[];
  groups: PublicGroup[];
  teamNames: string[];
}) {
  const router = useRouter();
  const pathname = usePathname();
  const searchParams = useSearchParams();

  function setParam(key: string, value: string) {
    const params = new URLSearchParams(searchParams.toString());
    if (value) params.set(key, value);
    else params.delete(key);
    // A competition/group/team change invalidates whatever single date was focused.
    params.delete("date");
    router.push(`${pathname}?${params.toString()}`);
  }

  const selectClass =
    "h-9 flex-1 rounded-lg border border-white/[0.08] bg-white/[0.03] px-2.5 text-xs text-white focus:border-brand-400/60 focus:outline-none [&>option]:bg-surface-900";

  return (
    <div className="flex flex-wrap gap-2">
      {competitions.length > 1 && (
        <select value={searchParams.get("competition") ?? ""} onChange={(e) => setParam("competition", e.target.value)} className={selectClass} aria-label="Filter by competition">
          <option value="">Tout konpetisyon</option>
          {competitions.map((c) => (
            <option key={c.id} value={c.id}>
              {c.name}
            </option>
          ))}
        </select>
      )}
      {groups.length > 0 && (
        <select value={searchParams.get("group") ?? ""} onChange={(e) => setParam("group", e.target.value)} className={selectClass} aria-label="Filter by group">
          <option value="">Tout gwoup</option>
          {groups.map((g) => (
            <option key={g.groupId} value={g.groupId}>
              {g.name}
            </option>
          ))}
        </select>
      )}
      {teamNames.length > 0 && (
        <select value={searchParams.get("team") ?? ""} onChange={(e) => setParam("team", e.target.value)} className={selectClass} aria-label="Filter by team">
          <option value="">Tout ekip</option>
          {teamNames.map((name) => (
            <option key={name} value={name}>
              {name}
            </option>
          ))}
        </select>
      )}
    </div>
  );
}
