import SectionHeader from "./SectionHeader";
import LiveStatusBadge from "./LiveStatusBadge";
import { LINEUP_STATUS_DISPLAY } from "@/lib/lineup-status-display";
import type { LiveMatchBundle } from "@/lib/live-match";

export default function TeamPanels({ bundle }: { bundle: LiveMatchBundle }) {
  return (
    <div className="grid gap-3 sm:grid-cols-2">
      <TeamPanel teamName={bundle.match.home_team.name} lineup={bundle.homeLineup} players={bundle.homePlayers} />
      <TeamPanel teamName={bundle.match.away_team.name} lineup={bundle.awayLineup} players={bundle.awayPlayers} />
    </div>
  );
}

function TeamPanel({
  teamName,
  lineup,
  players,
}: {
  teamName: string;
  lineup: LiveMatchBundle["homeLineup"];
  players: LiveMatchBundle["homePlayers"];
}) {
  const byId = new Map(players.map((p) => [p.id, p]));

  return (
    <div className="surface-panel p-4">
      <SectionHeader
        title={teamName}
        badge={
          lineup ? (
            <LiveStatusBadge label={LINEUP_STATUS_DISPLAY[lineup.status].label} tone={LINEUP_STATUS_DISPLAY[lineup.status].tone} />
          ) : (
            <LiveStatusBadge label="Not Submitted" tone="neutral" />
          )
        }
      />

      <div className="mb-3 flex items-center justify-between text-[10px] text-white/30">
        <span>Formation: —</span>
        <span>UTC Sync: Pending</span>
      </div>

      {!lineup ? (
        <p className="text-xs text-white/30">Lineup not submitted yet.</p>
      ) : (
        <>
          <p className="mb-1.5 text-[10px] font-semibold uppercase tracking-wide text-white/30">
            Starting XI (11) · Coach {lineup.coach_name}
          </p>
          <div className="mb-3 flex flex-col gap-1">
            {lineup.starting_xi.map((pid, i) => {
              const p = byId.get(pid);
              if (!p) return null;
              return (
                <div key={pid} className="flex items-center gap-2 text-xs">
                  <span className="flex h-5 w-5 flex-none items-center justify-center rounded-full bg-white/10 text-[10px] font-bold">
                    {p.number}
                  </span>
                  <span className="truncate text-white/80">{p.full_name}</span>
                  <span className="text-[9px] text-white/20">Pos —</span>
                  {i === 0 && <span className="rounded bg-emerald-500/20 px-1 text-[9px] font-bold text-emerald-400">GK</span>}
                  {lineup.captain_id === pid && (
                    <span className="rounded bg-amber-signal/20 px-1 text-[9px] font-bold text-amber-signal">C</span>
                  )}
                </div>
              );
            })}
          </div>

          <p className="mb-1.5 text-[10px] font-semibold uppercase tracking-wide text-white/30">
            Bench ({lineup.substitutes.length})
          </p>
          <div className="flex flex-wrap gap-1">
            {lineup.substitutes.map((pid) => {
              const p = byId.get(pid);
              if (!p) return null;
              return (
                <span key={pid} className="rounded bg-white/5 px-1.5 py-0.5 text-[10px] text-white/60">
                  {p.number} {p.full_name}
                </span>
              );
            })}
          </div>
        </>
      )}
    </div>
  );
}
