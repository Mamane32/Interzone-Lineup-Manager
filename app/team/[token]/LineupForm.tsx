"use client";

import { useMemo, useState, useTransition } from "react";
import Select from "@/components/ui/Select";
import Input from "@/components/ui/Input";
import Button from "@/components/ui/Button";
import { JerseyBadge, PlayerRow } from "@/components/ui/PlayerBadge";
import { playerLabel } from "@/lib/utils";
import { submitLineup } from "./actions";
import type { Player, Team } from "@/lib/types";

const STARTER_SLOTS = 11;
const SUB_SLOTS = 9;

export default function LineupForm({
  team,
  players,
  lineup,
  opponent,
  isHome,
  competitionName,
  round,
  token,
}: {
  team: Team;
  players: Player[];
  lineup: any;
  opponent: Team;
  isHome: boolean;
  competitionName: string | null;
  round: string | null;
  token: string;
}) {
  const alreadySubmitted = lineup.status === "submitted" && lineup.locked;

  if (alreadySubmitted) {
    return (
      <ConfirmedView
        team={team}
        players={players}
        lineup={lineup}
        opponent={opponent}
        isHome={isHome}
        competitionName={competitionName}
      />
    );
  }

  return (
    <Form
      team={team}
      players={players}
      lineup={lineup}
      opponent={opponent}
      isHome={isHome}
      competitionName={competitionName}
      round={round}
      token={token}
    />
  );
}

// ---------------------------------------------------------------------------
// Header used by both the form and the confirmation screen
// ---------------------------------------------------------------------------
function Header({
  team,
  opponent,
  isHome,
  competitionName,
}: {
  team: Team;
  opponent: Team;
  isHome: boolean;
  competitionName: string | null;
}) {
  return (
    <div className="bg-ink px-4 pb-6 pt-8 text-center text-white">
      {team.logo_url ? (
        // eslint-disable-next-line @next/next/no-img-element
        <img src={team.logo_url} alt="" className="mx-auto h-16 w-16 rounded-full object-cover" />
      ) : (
        <div className="mx-auto flex h-16 w-16 items-center justify-center rounded-full bg-white/10 font-display text-xl">
          {team.name.slice(0, 2).toUpperCase()}
        </div>
      )}
      {competitionName && (
        <p className="mt-3 font-display text-xs uppercase tracking-[0.2em] text-amber-signal">
          {competitionName}
        </p>
      )}
      <h1 className="font-display text-2xl font-semibold">{team.name}</h1>
      <p className="mt-1 text-sm text-white/60">Kont</p>
      <p className="font-display text-lg text-white/90">{opponent?.name ?? "—"}</p>
    </div>
  );
}

// ---------------------------------------------------------------------------
// Confirmation screen — shown once submitted & locked
// ---------------------------------------------------------------------------
function ConfirmedView({
  team,
  players,
  lineup,
  opponent,
  isHome,
  competitionName,
}: {
  team: Team;
  players: Player[];
  lineup: any;
  opponent: Team;
  isHome: boolean;
  competitionName: string | null;
}) {
  const byId = useMemo(() => new Map(players.map((p) => [p.id, p])), [players]);

  return (
    <main className="min-h-screen bg-coach-bg">
      <Header team={team} opponent={opponent} isHome={isHome} competitionName={competitionName} />

      <div className="mx-auto -mt-4 max-w-md rounded-t-2xl bg-coach-bg px-4 pb-16">
        <div className="mt-4 rounded-2xl border border-status-submitted/30 bg-status-submitted/10 p-5 text-center">
          <p className="text-lg font-semibold text-status-submitted">
            ✅ Lis ekip la voye avèk siksè.
          </p>
          <p className="mt-1 text-ink/70">Mèsi.</p>
        </div>

        <section className="mt-6 rounded-2xl bg-coach-card p-4 shadow-sm">
          <h2 className="mb-2 font-display text-sm font-semibold uppercase tracking-wide text-ink/50">
            Onz Titilè
          </h2>
          <div className="divide-y divide-coach-line">
            {lineup.starting_xi.map((pid: string) => {
              const p = byId.get(pid);
              if (!p) return null;
              return (
                <PlayerRow
                  key={pid}
                  number={p.number}
                  name={p.full_name}
                  trailing={lineup.captain_id === pid ? <span className="text-xs font-bold text-amber-signal">C</span> : undefined}
                />
              );
            })}
          </div>
        </section>

        <section className="mt-4 rounded-2xl bg-coach-card p-4 shadow-sm">
          <h2 className="mb-2 font-display text-sm font-semibold uppercase tracking-wide text-ink/50">
            Ranplasan
          </h2>
          <div className="divide-y divide-coach-line">
            {lineup.substitutes.map((pid: string) => {
              const p = byId.get(pid);
              if (!p) return null;
              return <PlayerRow key={pid} number={p.number} name={p.full_name} />;
            })}
          </div>
        </section>

        <p className="mt-6 text-center text-xs text-ink/40">
          Si gen erè, kontakte òganizasyon an pou yo louvri lis la ankò.
        </p>
      </div>
    </main>
  );
}

// ---------------------------------------------------------------------------
// The actual form
// ---------------------------------------------------------------------------
function Form({
  team,
  players,
  lineup,
  opponent,
  isHome,
  competitionName,
  round,
  token,
}: {
  team: Team;
  players: Player[];
  lineup: any;
  opponent: Team;
  isHome: boolean;
  competitionName: string | null;
  round: string | null;
  token: string;
}) {
  const [coachName, setCoachName] = useState(team.coach_name);
  const [coachPhone, setCoachPhone] = useState(team.coach_phone);
  const [starters, setStarters] = useState<string[]>(() => {
    const arr = [...lineup.starting_xi];
    while (arr.length < STARTER_SLOTS) arr.push("");
    return arr.slice(0, STARTER_SLOTS);
  });
  const [subs, setSubs] = useState<string[]>(() => {
    const arr = [...lineup.substitutes];
    while (arr.length < SUB_SLOTS) arr.push("");
    return arr.slice(0, SUB_SLOTS);
  });
  const [captain, setCaptain] = useState<string>(lineup.captain_id ?? "");
  const [remarks, setRemarks] = useState(lineup.remarks ?? "");
  const [error, setError] = useState<string | null>(null);
  const [pending, startTransition] = useTransition();
  const [done, setDone] = useState(false);

  const selected = new Set([...starters, ...subs].filter(Boolean));

  function optionsFor(currentValue: string) {
    return players.filter((p) => p.id === currentValue || !selected.has(p.id));
  }

  const startingPlayers = starters
    .filter(Boolean)
    .map((id) => players.find((p) => p.id === id))
    .filter((p): p is Player => Boolean(p));

  function updateStarter(i: number, value: string) {
    const next = [...starters];
    next[i] = value;
    setStarters(next);
    if (captain && !next.includes(captain)) setCaptain("");
  }

  function updateSub(i: number, value: string) {
    const next = [...subs];
    next[i] = value;
    setSubs(next);
  }

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);

    const fd = new FormData();
    fd.set("match_id", lineup.match_id);
    fd.set("coach_name", coachName);
    fd.set("coach_phone", coachPhone);
    fd.set("captain_id", captain);
    fd.set("remarks", remarks);
    starters.forEach((s, i) => fd.set(`starter_${i}`, s));
    subs.forEach((s, i) => fd.set(`sub_${i}`, s));

    startTransition(async () => {
      const result = await submitLineup(token, fd);
      if (!result.ok) {
        setError(result.error);
      } else {
        setDone(true);
      }
    });
  }

  if (done) {
    return (
      <ConfirmedView
        team={team}
        players={players}
        lineup={{ ...lineup, starting_xi: starters.filter(Boolean), substitutes: subs.filter(Boolean), captain_id: captain }}
        opponent={opponent}
        isHome={isHome}
        competitionName={competitionName}
      />
    );
  }

  return (
    <main className="min-h-screen bg-coach-bg pb-24">
      <Header team={team} opponent={opponent} isHome={isHome} competitionName={competitionName} />

      <form onSubmit={handleSubmit} className="mx-auto -mt-4 max-w-md rounded-t-2xl bg-coach-bg px-4">
        {lineup.status === "needs_correction" && (
          <div className="mt-4 rounded-xl bg-status-correction/10 p-3 text-center text-sm font-medium text-status-correction">
            Òganizasyon an mande pou ou korije lis la.
          </div>
        )}

        <section className="mt-4 rounded-2xl bg-coach-card p-4 shadow-sm">
          <h2 className="mb-3 font-display text-sm font-semibold uppercase tracking-wide text-ink/50">
            Enfòmasyon Antrenè
          </h2>
          <div className="flex flex-col gap-3">
            <div className="flex flex-col gap-1.5">
              <label className="text-sm font-semibold text-ink/60">Non Antrenè</label>
              <input
                value={coachName}
                onChange={(e) => setCoachName(e.target.value)}
                required
                className="h-12 rounded-xl border border-coach-line bg-white px-3 text-ink focus:border-status-submitted focus:outline-none"
              />
            </div>
            <div className="flex flex-col gap-1.5">
              <label className="text-sm font-semibold text-ink/60">Telefòn</label>
              <input
                value={coachPhone}
                onChange={(e) => setCoachPhone(e.target.value)}
                required
                className="h-12 rounded-xl border border-coach-line bg-white px-3 text-ink focus:border-status-submitted focus:outline-none"
              />
            </div>
          </div>
        </section>

        <section className="mt-4 rounded-2xl bg-coach-card p-4 shadow-sm">
          <h2 className="mb-3 font-display text-sm font-semibold uppercase tracking-wide text-ink/50">
            11 Titilè
          </h2>
          <div className="flex flex-col gap-3">
            {starters.map((value, i) => (
              <div key={i} className="flex items-center gap-2">
                <span className="font-display w-6 text-center text-sm text-ink/40">{i + 1}</span>
                <Select
                  tone="light"
                  value={value}
                  onChange={(e) => updateStarter(i, e.target.value)}
                  required
                  className="flex-1"
                >
                  <option value="">— Chwazi jwè —</option>
                  {optionsFor(value).map((p) => (
                    <option key={p.id} value={p.id}>
                      {playerLabel(p)}
                    </option>
                  ))}
                </Select>
              </div>
            ))}
          </div>
        </section>

        <section className="mt-4 rounded-2xl bg-coach-card p-4 shadow-sm">
          <h2 className="mb-3 font-display text-sm font-semibold uppercase tracking-wide text-ink/50">
            Ranplasan
          </h2>
          <div className="flex flex-col gap-3">
            {subs.map((value, i) => (
              <div key={i} className="flex items-center gap-2">
                <span className="font-display w-6 text-center text-sm text-ink/40">{i + 1}</span>
                <Select
                  tone="light"
                  value={value}
                  onChange={(e) => updateSub(i, e.target.value)}
                  className="flex-1"
                >
                  <option value="">— Chwazi jwè —</option>
                  {optionsFor(value).map((p) => (
                    <option key={p.id} value={p.id}>
                      {playerLabel(p)}
                    </option>
                  ))}
                </Select>
              </div>
            ))}
          </div>
        </section>

        <section className="mt-4 rounded-2xl bg-coach-card p-4 shadow-sm">
          <h2 className="mb-3 font-display text-sm font-semibold uppercase tracking-wide text-ink/50">
            Kapitèn
          </h2>
          <Select tone="light" value={captain} onChange={(e) => setCaptain(e.target.value)}>
            <option value="">— Chwazi kapitèn —</option>
            {startingPlayers.map((p) => (
              <option key={p.id} value={p.id}>
                {playerLabel(p)}
              </option>
            ))}
          </Select>
          {startingPlayers.length === 0 && (
            <p className="mt-2 text-xs text-ink/40">Chwazi 11 titilè yo anvan ou chwazi kapitèn nan.</p>
          )}
        </section>

        <section className="mt-4 rounded-2xl bg-coach-card p-4 shadow-sm">
          <h2 className="mb-3 font-display text-sm font-semibold uppercase tracking-wide text-ink/50">
            Remak
          </h2>
          <textarea
            value={remarks}
            onChange={(e) => setRemarks(e.target.value)}
            rows={3}
            placeholder="Opsyonèl"
            className="w-full rounded-xl border border-coach-line bg-white p-3 text-ink focus:border-status-submitted focus:outline-none"
          />
        </section>

        {error && (
          <p className="mt-4 rounded-xl bg-status-correction/10 p-3 text-center text-sm font-medium text-status-correction">
            {error}
          </p>
        )}

        <Button type="submit" variant="coach" size="lg" disabled={pending} className="mt-6 w-full">
          {pending ? "N ap voye..." : "VOYE LIS LA"}
        </Button>
      </form>
    </main>
  );
}
