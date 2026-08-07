import TeamCrest from "./TeamCrest";
import type { PublicGroup } from "@/lib/public-groups";
import { qualificationStatus, type QualificationStatus } from "@/lib/bracket";
import type { MatchResult } from "@/lib/standings";

const QUALIFICATION_BORDER: Record<QualificationStatus, string> = {
  qualified: "border-l-2 border-l-emerald-400",
  contention: "border-l-2 border-l-amber-signal",
  out: "border-l-2 border-l-transparent",
};

const FORM_DOT: Record<MatchResult, string> = {
  W: "bg-emerald-400 text-emerald-950",
  D: "bg-white/25 text-white/70",
  L: "bg-red-400/80 text-red-950",
};

function FormGuide({ form }: { form: MatchResult[] }) {
  if (form.length === 0) return <span className="text-white/20">—</span>;
  return (
    <div className="flex items-center justify-center gap-0.5">
      {form.map((r, i) => (
        <span key={i} className={`flex h-4 w-4 items-center justify-center rounded-full text-[8px] font-bold ${FORM_DOT[r]}`}>
          {r}
        </span>
      ))}
    </div>
  );
}

/**
 * One group's standings table — shared by /scores/competition (every
 * group, full table) and /match/[matchId] (one group, with the two teams
 * in this match highlighted), so the table markup only exists once.
 *
 * `allGroups` (defaults to just this one group) drives the qualification
 * indicator's left border — 1st/2nd always qualify, 3rd only if it's
 * currently one of the two best 3rd-place teams *across every group*, so
 * the indicator needs the whole competition's groups, not just this one,
 * to be accurate. Passing only this table's own group still works (a
 * single-group competition, or a caller that doesn't have the full list
 * yet) — the 3rd-place comparison then only sees its own group.
 */
export default function StandingsTable({ group, allGroups, highlightTeamNames }: { group: PublicGroup; allGroups?: PublicGroup[]; highlightTeamNames?: string[] }) {
  if (group.standings.length === 0) {
    return <p className="p-4 text-sm text-white/35">Pa gen match pwograme nan gwoup sa a ankò.</p>;
  }

  const groupsForQualification = allGroups ?? [group];

  return (
    <div className="overflow-x-auto">
      <table className="w-full text-left text-xs">
        <thead className="text-white/35">
          <tr>
            <th className="py-2 pl-2 pr-1"></th>
            <th className="px-2 py-2 font-medium">Ekip</th>
            <th className="px-2 py-2 text-center font-medium">MJ</th>
            <th className="px-2 py-2 text-center font-medium">V</th>
            <th className="px-2 py-2 text-center font-medium">N</th>
            <th className="px-2 py-2 text-center font-medium">D</th>
            <th className="px-2 py-2 text-center font-medium">DIF</th>
            <th className="px-3 py-2 text-center font-medium">PTS</th>
            <th className="px-2 py-2 text-center font-medium">Fòm</th>
          </tr>
        </thead>
        <tbody className="divide-y divide-white/[0.06]">
          {group.standings.map((row, i) => {
            const highlighted = highlightTeamNames?.includes(row.teamName);
            const qualification = qualificationStatus(i + 1, row.teamId, groupsForQualification);
            return (
              <tr key={row.teamId} className={`${QUALIFICATION_BORDER[qualification]} ${highlighted ? "bg-brand-400/[0.06]" : ""}`}>
                <td className="py-2.5 pl-2 pr-1 text-white/30 tabular-nums">{i + 1}</td>
                <td className="flex items-center gap-2 px-2 py-2.5">
                  <TeamCrest name={row.teamName} logoUrl={row.logoUrl} size={22} />
                  <span className={`truncate font-medium ${highlighted ? "text-brand-400" : "text-white/90"}`}>{row.teamName}</span>
                </td>
                <td className="px-2 py-2.5 text-center tabular-nums text-white/60">{row.played}</td>
                <td className="px-2 py-2.5 text-center tabular-nums text-white/60">{row.won}</td>
                <td className="px-2 py-2.5 text-center tabular-nums text-white/60">{row.drawn}</td>
                <td className="px-2 py-2.5 text-center tabular-nums text-white/60">{row.lost}</td>
                <td className="px-2 py-2.5 text-center tabular-nums text-white/60">{row.goalDifference > 0 ? `+${row.goalDifference}` : row.goalDifference}</td>
                <td className="px-3 py-2.5 text-center font-display font-bold tabular-nums text-white">{row.points}</td>
                <td className="px-2 py-2.5">
                  <FormGuide form={row.form} />
                </td>
              </tr>
            );
          })}
        </tbody>
      </table>
      <div className="flex flex-wrap items-center gap-3 border-t border-white/[0.06] px-3 py-2 text-[10px] text-white/35">
        <span className="flex items-center gap-1.5">
          <span className="h-2 w-2 rounded-full bg-emerald-400" /> Kalifye
        </span>
        <span className="flex items-center gap-1.5">
          <span className="h-2 w-2 rounded-full bg-amber-signal" /> Nan kous la
        </span>
      </div>
    </div>
  );
}
