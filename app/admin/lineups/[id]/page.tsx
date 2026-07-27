import { notFound } from "next/navigation";
import { supabaseAdmin } from "@/lib/supabase-admin";
import Card from "@/components/ui/Card";
import Button from "@/components/ui/Button";
import StatusBadge from "@/components/ui/StatusBadge";
import { PlayerRow, JerseyBadge } from "@/components/ui/PlayerBadge";
import ExportPanel from "./ExportPanel";
import { reopenLineup, lockLineup } from "./actions";
import {
  exportSimpleList,
  exportVMix,
  exportPlainText,
  playersById,
  formatMatchDate,
} from "@/lib/utils";
import type { Lineup, Player, Team } from "@/lib/types";
import { requireAdmin } from "@/lib/access";

// Always render on request — this page reads live data via the service-role
// Supabase client, and must never be executed or cached at build time.
export const dynamic = "force-dynamic";


export default async function LineupDetailPage({ params }: { params: { id: string } }) {
  await requireAdmin();
  const supabase = supabaseAdmin();

  const { data: lineup } = await supabase
    .from("lineups")
    .select("*, team:teams(*), match:matches(*, competition:competitions(*), home_team:teams!matches_home_team_id_fkey(*), away_team:teams!matches_away_team_id_fkey(*))")
    .eq("id", params.id)
    .single();

  if (!lineup) notFound();

  const { data: players } = await supabase
    .from("players")
    .select("*")
    .eq("team_id", lineup.team_id)
    .order("number");

  const playerList = (players ?? []) as Player[];
  const byId = playersById(playerList);
  const l = lineup as unknown as Lineup;
  const team = (lineup as any).team as Team;
  const match = (lineup as any).match;

  const captain = l.captain_id ? byId.get(l.captain_id) : undefined;

  const formats = [
    { key: "simple", label: "Simple List", content: exportSimpleList(l, playerList), filename: `${team.name}-simple.txt` },
    { key: "vmix", label: "vMix", content: exportVMix(l, playerList, team), filename: `${team.name}-vmix.txt` },
    { key: "plain", label: "Plain Text", content: exportPlainText(l, playerList, team), filename: `${team.name}.txt` },
  ];

  return (
    <div className="flex flex-col gap-6">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <p className="text-xs uppercase tracking-wide text-amber-signal">
            {match?.competition?.name ?? "No competition"} · {formatMatchDate(match.match_date, match.match_time)}
          </p>
          <h1 className="font-display text-3xl font-semibold">{team.name}</h1>
          <p className="text-sm text-ink-muted">
            {match?.home_team?.name} vs {match?.away_team?.name}
          </p>
        </div>
        <StatusBadge status={l.status} />
      </div>

      <div className="grid gap-6 lg:grid-cols-2">
        <div className="flex flex-col gap-6">
          <Card>
            <h2 className="mb-3 font-display text-lg font-semibold">Coach</h2>
            <p className="font-medium">{team.coach_name}</p>
            <p className="text-ink-muted">{team.coach_phone}</p>
            {team.coach_email && <p className="text-ink-muted">{team.coach_email}</p>}
            {l.remarks && (
              <div className="mt-3 rounded-lg bg-ink p-3 text-sm text-white/80">
                <p className="mb-1 text-xs uppercase tracking-wide text-ink-muted">Remarks</p>
                {l.remarks}
              </div>
            )}

            <div className="mt-4 flex gap-3 border-t border-ink-line pt-4">
              {l.locked ? (
                <form action={reopenLineup.bind(null, l.id)}>
                  <Button type="submit" variant="secondary">
                    Reopen for correction
                  </Button>
                </form>
              ) : (
                <form action={lockLineup.bind(null, l.id)}>
                  <Button type="submit" variant="secondary">
                    Lock submission
                  </Button>
                </form>
              )}
            </div>
          </Card>

          <Card>
            <h2 className="mb-3 font-display text-lg font-semibold">
              Starting XI ({l.starting_xi.length}/11)
            </h2>
            {l.starting_xi.length === 0 && <p className="text-ink-muted">Not submitted yet.</p>}
            <div className="divide-y divide-ink-line">
              {l.starting_xi.map((pid) => {
                const p = byId.get(pid);
                if (!p) return null;
                return (
                  <PlayerRow
                    key={pid}
                    number={p.number}
                    name={p.full_name}
                    trailing={l.captain_id === pid ? <span className="text-xs font-semibold text-amber-signal">CAPTAIN</span> : undefined}
                  />
                );
              })}
            </div>
          </Card>

          <Card>
            <h2 className="mb-3 font-display text-lg font-semibold">
              Substitutes ({l.substitutes.length}/9)
            </h2>
            {l.substitutes.length === 0 && <p className="text-ink-muted">None submitted.</p>}
            <div className="divide-y divide-ink-line">
              {l.substitutes.map((pid) => {
                const p = byId.get(pid);
                if (!p) return null;
                return <PlayerRow key={pid} number={p.number} name={p.full_name} />;
              })}
            </div>
          </Card>
        </div>

        <Card className="h-fit">
          <h2 className="mb-3 font-display text-lg font-semibold">Export</h2>
          {captain && (
            <p className="mb-3 flex items-center gap-2 text-sm text-ink-muted">
              Captain: <JerseyBadge number={captain.number} /> {captain.full_name}
            </p>
          )}
          <ExportPanel formats={formats} />
        </Card>
      </div>
    </div>
  );
}
