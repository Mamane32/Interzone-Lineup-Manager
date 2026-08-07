import { Crown } from "lucide-react";
import type { PublicTeamLineup } from "@/lib/public-match";

/** One team's read-only pitch diagram — plain percentage-positioned dots, no interactivity (the editable version lives in the Broadcast Control Center's Tactical Formation Panel; this only ever renders what's already been finalized there). */
function FormationPitch({ lineup }: { lineup: PublicTeamLineup }) {
  if (lineup.formationSlots.length === 0) return null;

  return (
    <div className="relative aspect-[3/4] w-full overflow-hidden rounded-xl border border-white/10 bg-gradient-to-b from-emerald-900/40 to-emerald-950/60">
      <div className="absolute inset-x-[15%] top-1/2 h-px bg-white/15" aria-hidden="true" />
      <div className="absolute left-1/2 top-1/2 h-14 w-14 -translate-x-1/2 -translate-y-1/2 rounded-full border border-white/15" aria-hidden="true" />
      {lineup.formationSlots.map((slot) => (
        <div
          key={slot.playerId}
          className="absolute flex -translate-x-1/2 -translate-y-1/2 flex-col items-center gap-0.5"
          style={{ left: `${slot.x}%`, top: `${slot.y}%` }}
        >
          <span
            className={`flex h-6 w-6 items-center justify-center rounded-full text-[10px] font-bold tabular-nums shadow ${
              slot.isGoalkeeper ? "bg-amber-signal text-surface-950" : "bg-white text-surface-950"
            }`}
          >
            {slot.shirtNumber}
          </span>
          {slot.isCaptain && <Crown size={9} className="text-amber-signal" />}
        </div>
      ))}
    </div>
  );
}

function PlayerList({ title, players }: { title: string; players: PublicTeamLineup["startingXI"] }) {
  if (players.length === 0) return null;
  return (
    <div>
      <p className="mb-1.5 text-[10px] font-semibold uppercase tracking-wide text-white/35">{title}</p>
      <div className="flex flex-col gap-1">
        {players.map((p) => (
          <div key={p.playerId} className="flex items-center gap-2 text-xs">
            <span className="w-5 flex-none text-center font-display font-bold tabular-nums text-white/40">{p.number ?? "–"}</span>
            <span className="truncate text-white/85">{p.name}</span>
            {p.isCaptain && <Crown size={11} className="flex-none text-amber-signal" />}
            {p.position && <span className="ml-auto flex-none text-[10px] uppercase tracking-wide text-white/30">{p.position}</span>}
          </div>
        ))}
      </div>
    </div>
  );
}

/** One team's lineup card — formation pitch (when the Tactical Formation Panel was used for this match) plus the plain Starting XI / Substitutes list (from the coach's submitted lineup, independent of whether a formation was ever drawn). */
function TeamLineupCard({ teamName, lineup }: { teamName: string; lineup: PublicTeamLineup }) {
  return (
    <div className="flex flex-1 flex-col gap-3">
      <p className="text-center text-xs font-semibold uppercase tracking-wide text-white/50">{teamName}</p>
      {lineup.formationName && <p className="text-center text-[10px] text-white/30">{lineup.formationName}</p>}
      <FormationPitch lineup={lineup} />
      <PlayerList title="Starting XI" players={lineup.startingXI} />
      <PlayerList title="Sibstitisyon" players={lineup.substitutes} />
    </div>
  );
}

/**
 * The Live Match Center's Lineups section — only rendered when at least
 * one team's lineup is `available` (submitted AND locked; see
 * lib/public-match.ts's toPublicTeamLineup doc comment for why an
 * unlocked/draft lineup is never shown). A team whose own lineup isn't
 * available yet still gets its half of the section, just without a card,
 * rather than hiding the whole section over one team's missing data.
 */
export default function PublicLineups({
  homeTeamName,
  awayTeamName,
  homeLineup,
  awayLineup,
}: {
  homeTeamName: string;
  awayTeamName: string;
  homeLineup: PublicTeamLineup;
  awayLineup: PublicTeamLineup;
}) {
  if (!homeLineup.available && !awayLineup.available) return null;

  return (
    <div className="surface-panel p-4">
      <h2 className="mb-3 text-xs font-semibold uppercase tracking-wide text-white/40">Lineup</h2>
      <div className="flex flex-col gap-5 sm:flex-row">
        {homeLineup.available ? <TeamLineupCard teamName={homeTeamName} lineup={homeLineup} /> : <p className="flex-1 text-center text-xs text-white/30">Lineup {homeTeamName} pa disponib ankò.</p>}
        {awayLineup.available ? <TeamLineupCard teamName={awayTeamName} lineup={awayLineup} /> : <p className="flex-1 text-center text-xs text-white/30">Lineup {awayTeamName} pa disponib ankò.</p>}
      </div>
    </div>
  );
}
