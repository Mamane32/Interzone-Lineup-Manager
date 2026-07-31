import Image from "next/image";
import { Download, Users2 } from "lucide-react";
import { getLiveMatch } from "@/lib/live-match";
import { formatMatchDate } from "@/lib/utils";
import StatisticsPanel from "@/components/live/StatisticsPanel";
import { EVENT_META, minuteSort } from "@/components/live/Timeline";
import type { MatchEvent } from "@/lib/types";

export const dynamic = "force-dynamic";

export default async function MatchReportPage({ params }: { params: { matchId: string } }) {
  const bundle = await getLiveMatch(params.matchId);
  const { match, events, homePlayers, awayPlayers } = bundle;

  const byId = new Map([...homePlayers, ...awayPlayers].map((p) => [p.id, p]));
  const teamsById = new Map([
    [match.home_team_id, match.home_team],
    [match.away_team_id, match.away_team],
  ]);

  const sorted = [...events].sort((a, b) => minuteSort(a.minute, b.minute));
  const goals = sorted.filter((e) => e.type === "goal" || e.type === "penalty_goal" || e.type === "own_goal");
  const cards = sorted.filter((e) => e.type === "yellow_card" || e.type === "second_yellow" || e.type === "red_card");
  const subs = sorted.filter((e) => e.type === "substitution");

  return (
    <div className="mx-auto max-w-4xl pb-16">
      {/* Final score header */}
      <div className="surface-panel p-6 text-center">
        <p className="text-xs uppercase tracking-[0.2em] text-white/40">
          {match.competition?.name ?? "No competition"} {match.round ? `· ${match.round}` : ""}
        </p>
        <p className="mt-1 text-xs text-white/30">{formatMatchDate(match.match_date, match.match_time)}</p>
        <div className="mt-5 grid grid-cols-3 items-center">
          <TeamCol name={match.home_team.name} logo={match.home_team.logo_url} />
          <p className="font-display text-4xl font-black tabular-nums">
            {match.home_score ?? 0} – {match.away_score ?? 0}
          </p>
          <TeamCol name={match.away_team.name} logo={match.away_team.logo_url} />
        </div>
      </div>

      {/* Officials / venue / attendance */}
      <div className="mt-4 grid grid-cols-2 gap-3 sm:grid-cols-4">
        <ReportStat label="Venue" value={match.venue || `Teren ${match.home_team.name}`} />
        <ReportStat label="Referee" value={match.referee_name || "—"} />
        <ReportStat label="Attendance" value="—" note="Placeholder" />
        <div className="flex items-end justify-center rounded-xl border border-white/10 bg-white/[0.03] p-3">
          <button
            disabled
            className="flex items-center gap-1.5 rounded-lg bg-white/5 px-3 py-1.5 text-[11px] font-semibold text-white/30"
            title="Export not implemented yet"
          >
            <Download size={12} /> Export PDF
          </button>
        </div>
      </div>

      <ReportSection title="Goals">
        <EventList events={goals} byId={byId} teamsById={teamsById} empty="No goals." />
      </ReportSection>

      <ReportSection title="Cards">
        <EventList events={cards} byId={byId} teamsById={teamsById} empty="No cards." />
      </ReportSection>

      <ReportSection title="Substitutions">
        <EventList events={subs} byId={byId} teamsById={teamsById} empty="No substitutions." />
      </ReportSection>

      <ReportSection title="Full Timeline">
        <EventList events={sorted} byId={byId} teamsById={teamsById} empty="No events recorded." />
      </ReportSection>

      <ReportSection title="Statistics">
        <StatisticsPanel homeTeam={match.home_team} awayTeam={match.away_team} />
      </ReportSection>

      <ReportSection title="Squads">
        <div className="grid gap-3 sm:grid-cols-2">
          {[
            { name: bundle.match.home_team.name, lineup: bundle.homeLineup, players: bundle.homePlayers },
            { name: bundle.match.away_team.name, lineup: bundle.awayLineup, players: bundle.awayPlayers },
          ].map(({ name, lineup, players }) => (
            <div key={name} className="rounded-xl border border-white/10 bg-white/[0.03] p-4">
              <p className="mb-2 flex items-center gap-1.5 text-xs font-semibold text-white/80">
                <Users2 size={13} /> {name}
              </p>
              {!lineup ? (
                <p className="text-xs text-white/30">Lineup not submitted.</p>
              ) : (
                <p className="text-xs leading-relaxed text-white/50">
                  {lineup.starting_xi
                    .map((pid) => players.find((p) => p.id === pid))
                    .filter(Boolean)
                    .map((p) => p!.full_name)
                    .join(", ")}
                </p>
              )}
            </div>
          ))}
        </div>
      </ReportSection>
    </div>
  );
}

function TeamCol({ name, logo }: { name: string; logo: string | null }) {
  return (
    <div className="flex flex-col items-center gap-2">
      {logo ? (
        <Image src={logo} alt="" width={48} height={48} className="h-12 w-12 rounded-full object-cover" />
      ) : (
        <div className="flex h-12 w-12 items-center justify-center rounded-full bg-white/10 text-xs font-display">
          {name.slice(0, 2).toUpperCase()}
        </div>
      )}
      <span className="max-w-[8rem] truncate text-xs font-medium text-white/80">{name}</span>
    </div>
  );
}

function ReportStat({ label, value, note }: { label: string; value: string; note?: string }) {
  return (
    <div className="rounded-xl border border-white/10 bg-white/[0.03] p-3 text-center">
      <p className="text-[10px] uppercase tracking-wide text-white/30">{label}</p>
      <p className="mt-1 truncate text-sm font-semibold text-white/80">{value}</p>
      {note && <p className="text-[9px] text-white/20">{note}</p>}
    </div>
  );
}

function ReportSection({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <div className="mt-6">
      <h2 className="mb-2 text-xs font-semibold uppercase tracking-wide text-white/40">{title}</h2>
      {children}
    </div>
  );
}

function EventList({
  events,
  byId,
  teamsById,
  empty,
}: {
  events: MatchEvent[];
  byId: Map<string, { number: number; full_name: string }>;
  teamsById: Map<string, { name: string }>;
  empty: string;
}) {
  if (events.length === 0) {
    return <p className="rounded-xl border border-white/10 bg-white/[0.03] p-4 text-center text-xs text-white/30">{empty}</p>;
  }
  return (
    <div className="flex flex-col gap-1.5">
      {events.map((e) => {
        const meta = EVENT_META[e.type];
        const player = e.player_id ? byId.get(e.player_id) : null;
        const team = e.team_id ? teamsById.get(e.team_id) : null;
        return (
          <div key={e.id} className="flex items-center gap-3 rounded-lg border border-white/10 bg-white/[0.03] px-3 py-2 text-xs">
            <span className="w-9 flex-none text-center font-display font-bold text-white/50">{e.minute}&apos;</span>
            <span>{meta.icon}</span>
            <span className="flex-1 truncate text-white/80">
              {meta.label}
              {team ? ` · ${team.name}` : ""}
              {player ? ` · ${player.full_name}` : ""}
            </span>
          </div>
        );
      })}
    </div>
  );
}
