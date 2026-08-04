import { requireCoach } from "@/lib/coach-auth";
import { supabaseAdmin } from "@/lib/supabase-admin";
import { MIN_ACTIVE_ROSTER_PLAYERS, getRosterCapacity } from "@/lib/roster";
import Card from "@/components/ui/Card";
import AddPlayerForm from "@/components/coach/AddPlayerForm";
import PlayerCard from "@/components/coach/PlayerCard";
import type { Player } from "@/lib/types";

export const dynamic = "force-dynamic";

/**
 * The coach-owned Team Roster (Sprint 3 Phase 2 Master Plan §4) — the
 * permanent source of truth Match Squad selects from. Never blocked, at
 * any roster size, including zero — the gate lives on the Lineup/Formation
 * side (lib/coach-auth.ts's requireRosterReady), not here.
 */
export default async function RosterPage({
  params,
  searchParams,
}: {
  params: { token: string };
  searchParams: { error?: string };
}) {
  const { team } = await requireCoach(params.token);

  const admin = supabaseAdmin();
  const [{ data }, capacity] = await Promise.all([
    admin.from("players").select("*").eq("team_id", team.id).order("number"),
    getRosterCapacity(team.competition_id),
  ]);
  const players = (data ?? []) as Player[];

  const activePlayers = players.filter((p) => p.active !== false);
  const inactivePlayers = players.filter((p) => p.active === false);
  const activeCount = activePlayers.length;
  const ready = activeCount >= MIN_ACTIVE_ROSTER_PLAYERS;
  const remaining = Math.max(0, MIN_ACTIVE_ROSTER_PLAYERS - activeCount);
  const capacityPct = Math.min(100, (activeCount / capacity) * 100);

  return (
    <div className="flex flex-col gap-4">
      <div>
        <h1 className="font-display text-xl font-semibold text-ink">Squad Players</h1>
        <p className="text-sm text-ink/40">Your permanent team roster.</p>
      </div>

      {searchParams.error === "roster-incomplete" && (
        <p className="rounded-xl bg-amber-signal/10 p-3 text-sm font-medium text-amber-signal">
          Match Squad unlocks once your roster has {MIN_ACTIVE_ROSTER_PLAYERS} active players. Add more players below to
          continue.
        </p>
      )}

      {/* Capacity represents the permanent squad size — reused from the
          competition's own configuration (match_squad_size if set, else a
          computed 11 + max_bench; never a new column), distinct from the
          Match Squad unlock threshold shown separately below it. */}
      <Card className="!bg-coach-card !border-coach-line text-ink">
        <div className="flex items-baseline justify-between">
          <span className="font-display text-lg font-semibold text-ink">
            {activeCount} / {MIN_ACTIVE_ROSTER_PLAYERS} Players {ready && <span className="text-status-submitted">✓</span>}
          </span>
          <span className="text-sm font-medium text-ink/40">Maximum: {capacity} players</span>
        </div>
        <div className="mt-2.5 h-2.5 overflow-hidden rounded-full bg-coach-bg">
          <div className="h-full rounded-full bg-status-submitted transition-all" style={{ width: `${capacityPct}%` }} />
        </div>
        {!ready && (
          <p className="mt-2.5 text-xs font-medium text-amber-signal">
            {remaining} more active {remaining === 1 ? "player" : "players"} needed to unlock Match Squad (
            {MIN_ACTIVE_ROSTER_PLAYERS} minimum).
          </p>
        )}
      </Card>

      <Card className="!bg-coach-card !border-coach-line text-ink">
        <AddPlayerForm token={params.token} />
      </Card>

      <div>
        <h2 className="mb-2 px-1 font-display text-xs font-semibold uppercase tracking-wide text-ink/40">
          Current Players ({activeCount})
        </h2>
        <Card className="!bg-coach-card !border-coach-line !p-0 text-ink">
          {activePlayers.length === 0 && inactivePlayers.length === 0 ? (
            <p className="p-6 text-center text-sm text-ink/40">No players yet — add your first player above.</p>
          ) : activePlayers.length === 0 ? (
            <p className="p-6 text-center text-sm text-ink/40">No active players — reactivate a player below.</p>
          ) : (
            <div className="divide-y divide-coach-line">
              {activePlayers.map((p) => (
                <PlayerCard key={p.id} token={params.token} player={p} />
              ))}
            </div>
          )}
        </Card>
      </div>

      {inactivePlayers.length > 0 && (
        <div>
          <h2 className="mb-2 px-1 font-display text-xs font-semibold uppercase tracking-wide text-ink/40">
            Inactive ({inactivePlayers.length})
          </h2>
          <Card className="!bg-coach-card !border-coach-line !p-0 text-ink">
            <div className="divide-y divide-coach-line">
              {inactivePlayers.map((p) => (
                <PlayerCard key={p.id} token={params.token} player={p} />
              ))}
            </div>
          </Card>
        </div>
      )}
    </div>
  );
}
