import TeamCrest from "./TeamCrest";
import type { PublicGroup } from "@/lib/public-groups";

/**
 * One group's standings table — shared by /scores/competition (every
 * group, full table) and /match/[matchId] (one group, with the two teams
 * in this match highlighted), so the table markup only exists once.
 */
export default function StandingsTable({ group, highlightTeamNames }: { group: PublicGroup; highlightTeamNames?: string[] }) {
  if (group.standings.length === 0) {
    return <p className="p-4 text-sm text-white/35">Pa gen match pwograme nan gwoup sa a ankò.</p>;
  }

  return (
    <div className="overflow-x-auto">
      <table className="w-full text-left text-xs">
        <thead className="text-white/35">
          <tr>
            <th className="px-4 py-2 font-medium">Ekip</th>
            <th className="px-2 py-2 text-center font-medium">MJ</th>
            <th className="px-2 py-2 text-center font-medium">V</th>
            <th className="px-2 py-2 text-center font-medium">N</th>
            <th className="px-2 py-2 text-center font-medium">D</th>
            <th className="px-2 py-2 text-center font-medium">DIF</th>
            <th className="px-3 py-2 text-center font-medium">PTS</th>
          </tr>
        </thead>
        <tbody className="divide-y divide-white/[0.06]">
          {group.standings.map((row, i) => {
            const highlighted = highlightTeamNames?.includes(row.teamName);
            return (
              <tr key={row.teamId} className={highlighted ? "bg-brand-400/[0.06]" : undefined}>
                <td className="flex items-center gap-2 px-4 py-2.5">
                  <span className="w-3 flex-none text-white/30 tabular-nums">{i + 1}</span>
                  <TeamCrest name={row.teamName} logoUrl={row.logoUrl} size={22} />
                  <span className={`truncate font-medium ${highlighted ? "text-brand-400" : "text-white/90"}`}>{row.teamName}</span>
                </td>
                <td className="px-2 py-2.5 text-center tabular-nums text-white/60">{row.played}</td>
                <td className="px-2 py-2.5 text-center tabular-nums text-white/60">{row.won}</td>
                <td className="px-2 py-2.5 text-center tabular-nums text-white/60">{row.drawn}</td>
                <td className="px-2 py-2.5 text-center tabular-nums text-white/60">{row.lost}</td>
                <td className="px-2 py-2.5 text-center tabular-nums text-white/60">{row.goalDifference > 0 ? `+${row.goalDifference}` : row.goalDifference}</td>
                <td className="px-3 py-2.5 text-center font-display font-bold tabular-nums text-white">{row.points}</td>
              </tr>
            );
          })}
        </tbody>
      </table>
    </div>
  );
}
