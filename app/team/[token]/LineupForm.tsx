"use client";

import { useMemo, useState, useTransition } from "react";
import { ShieldAlert } from "lucide-react";
import Select from "@/components/ui/Select";
import Button from "@/components/ui/Button";
import { PlayerRow } from "@/components/ui/PlayerBadge";
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
    return <ConfirmedView team={team} players={players} lineup={lineup} opponent={opponent} />;
  }

  return (
    <Form
      team={team}
      players={players}
      lineup={lineup}
      opponent={opponent}
      competitionName={competitionName}
      round={round}
      token={token}
    />
  );
}

// ---------------------------------------------------------------------------
// Compact match context strip — the (coach) layout already shows team
// identity in its header, so this only needs to say who the opponent is.
// ---------------------------------------------------------------------------
function MatchStrip({
  opponent,
  competitionName,
  round,
}: {
  opponent: Team;
  competitionName?: string | null;
  round?: string | null;
}) {
  return (
    <div className="animate-fade-up rounded-2xl bg-gradient-to-br from-ink to-ink-panel p-4 text-white shadow-sm">
      {competitionName && (
        <p className="text-[11px] uppercase tracking-[0.2em] text-amber-signal">
          {competitionName} {round ? `· ${round}` : ""}
        </p>
      )}
      <p className="mt-1 font-display text-lg font-semibold">Kont {opponent?.name ?? "—"}</p>
    </div>
  );
}

/** A tiny pill badge for Captain / Goalkeeper markers on a player row. */
function Chip({ tone, children }: { tone: "captain" | "gk"; children: React.ReactNode }) {
  const cls =
    tone === "captain"
      ? "bg-amber-signal/15 text-amber-signal"
      : "bg-status-submitted/15 text-status-submitted";
  return <span className={`rounded-full px-2 py-0.5 text-[10px] font-bold ${cls}`}>{children}</span>;
}

// ---------------------------------------------------------------------------
// Confirmation screen — shown once submitted & locked
// ---------------------------------------------------------------------------
function ConfirmedView({
  team,
  players,
  lineup,
  opponent,
}: {
  team: Team;
  players: Player[];
  lineup: any;
  opponent: Team;
}) {
  const byId = useMemo(() => new Map(players.map((p) => [p.id, p])), [players]);

  return (
    <div className="flex flex-col gap-4 pb-10">
      <div className="animate-success-pop rounded-2xl border border-status-submitted/30 bg-status-submitted/10 p-5 text-center">
        <p className="text-lg font-semibold text-status-submitted">✅ Lis ekip la voye avèk siksè.</p>
        <p className="mt-1 text-ink/70">Mèsi.</p>
      </div>

      <p className="text-center text-sm text-ink/50">Kont {opponent?.name ?? "—"}</p>

      <section className="animate-fade-up rounded-2xl bg-coach-card p-4 shadow-sm">
        <h2 className="mb-2 font-display text-sm font-semibold uppercase tracking-wide text-ink/50">
          Onz Titilè
        </h2>
        <div className="divide-y divide-coach-line">
          {lineup.starting_xi.map((pid: string, i: number) => {
            const p = byId.get(pid);
            if (!p) return null;
            return (
              <PlayerRow
                key={pid}
                number={p.number}
                name={p.full_name}
                trailing={
                  <div className="flex gap-1">
                    {i === 0 && <Chip tone="gk">GK</Chip>}
                    {lineup.captain_id === pid && <Chip tone="captain">C</Chip>}
                  </div>
                }
              />
            );
          })}
        </div>
      </section>

      <section className="animate-fade-up rounded-2xl bg-coach-card p-4 shadow-sm">
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

      <p className="text-center text-xs text-ink/40">
        Si gen erè, kontakte òganizasyon an pou yo louvri lis la ankò.
      </p>
    </div>
  );
}

// ---------------------------------------------------------------------------
// The actual form — same fields, same validation, same submitLineup() call
// as before. Only the layout/markup around it changed.
// ---------------------------------------------------------------------------
function Form({
  team,
  players,
  lineup,
  opponent,
  competitionName,
  round,
  token,
}: {
  team: Team;
  players: Player[];
  lineup: any;
  opponent: Team;
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
      />
    );
  }

  return (
    <form onSubmit={handleSubmit} className="flex flex-col gap-4 pb-10">
      <MatchStrip opponent={opponent} competitionName={competitionName} round={round} />

      {lineup.status === "needs_correction" && (
        <div className="flex items-center gap-2 rounded-xl bg-status-correction/10 p-3 text-sm font-medium text-status-correction">
          <ShieldAlert size={16} className="flex-none" />
          Òganizasyon an mande pou ou korije lis la.
        </div>
      )}

      <section className="animate-fade-up rounded-2xl bg-coach-card p-4 shadow-sm">
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

      <section className="animate-fade-up rounded-2xl bg-coach-card p-4 shadow-sm">
        <h2 className="mb-3 font-display text-sm font-semibold uppercase tracking-wide text-ink/50">
          11 Titilè
        </h2>
        <div className="flex flex-col gap-3">
          {starters.map((value, i) => (
            <div key={i} className="flex items-center gap-2">
              <span className="flex w-7 flex-none flex-col items-center font-display text-sm text-ink/40">
                {i + 1}
                {i === 0 && <span className="text-[9px] font-semibold text-status-submitted">GK</span>}
              </span>
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

      <section className="animate-fade-up rounded-2xl bg-coach-card p-4 shadow-sm">
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

      <section className="animate-fade-up rounded-2xl bg-coach-card p-4 shadow-sm">
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

      <section className="animate-fade-up rounded-2xl bg-coach-card p-4 shadow-sm">
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
        <p className="rounded-xl bg-status-correction/10 p-3 text-center text-sm font-medium text-status-correction">
          {error}
        </p>
      )}

      <Button type="submit" variant="coach" size="lg" disabled={pending} className="w-full">
        {pending ? "N ap voye..." : "VOYE LIS LA"}
      </Button>
    </form>
  );
}
