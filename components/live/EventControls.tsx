"use client";

import { useState, useTransition } from "react";
import { X } from "lucide-react";
import Modal from "./Modal";
import { addMatchEvent } from "@/app/live/[matchId]/actions";
import type { MatchEventType, Player, Team } from "@/lib/types";

const EVENT_TYPES: { value: MatchEventType; label: string; needsTeamPlayer: boolean }[] = [
  { value: "yellow_card", label: "🟨 Yellow Card", needsTeamPlayer: true },
  { value: "second_yellow", label: "🟨🟥 Second Yellow", needsTeamPlayer: true },
  { value: "red_card", label: "🟥 Red Card", needsTeamPlayer: true },
  { value: "substitution", label: "🔁 Substitution", needsTeamPlayer: true },
  { value: "var", label: "📺 VAR", needsTeamPlayer: false },
  { value: "penalty_missed", label: "❌ Penalty Missed", needsTeamPlayer: true },
  { value: "injury", label: "🩹 Injury", needsTeamPlayer: true },
  { value: "match_start", label: "▶️ Match Start", needsTeamPlayer: false },
  { value: "half_time", label: "⏸️ Half Time", needsTeamPlayer: false },
  { value: "match_resume", label: "▶️ Match Resume", needsTeamPlayer: false },
  { value: "match_end", label: "⏹️ Match End", needsTeamPlayer: false },
];

export default function EventControls({
  matchId,
  homeTeam,
  awayTeam,
  homePlayers,
  awayPlayers,
}: {
  matchId: string;
  homeTeam: Team;
  awayTeam: Team;
  homePlayers: Player[];
  awayPlayers: Player[];
}) {
  const [active, setActive] = useState<MatchEventType | null>(null);
  const activeDef = EVENT_TYPES.find((e) => e.value === active);

  return (
    <div className="rounded-2xl border border-white/10 bg-white/[0.03] p-4">
      <h2 className="mb-3 text-xs font-semibold uppercase tracking-wide text-white/40">Match Events</h2>
      <div className="grid grid-cols-2 gap-1.5">
        {EVENT_TYPES.map((e) => (
          <button
            key={e.value}
            type="button"
            onClick={() => setActive(e.value)}
            className="rounded-lg bg-white/5 px-2 py-2 text-left text-[11px] font-medium text-white/70 transition-all hover:bg-white/10 active:scale-95"
          >
            {e.label}
          </button>
        ))}
      </div>

      {activeDef && (
        <EventDialog
          matchId={matchId}
          type={activeDef.value}
          label={activeDef.label}
          needsTeamPlayer={activeDef.needsTeamPlayer}
          homeTeam={homeTeam}
          awayTeam={awayTeam}
          homePlayers={homePlayers}
          awayPlayers={awayPlayers}
          onClose={() => setActive(null)}
        />
      )}
    </div>
  );
}

function EventDialog({
  matchId,
  type,
  label,
  needsTeamPlayer,
  homeTeam,
  awayTeam,
  homePlayers,
  awayPlayers,
  onClose,
}: {
  matchId: string;
  type: MatchEventType;
  label: string;
  needsTeamPlayer: boolean;
  homeTeam: Team;
  awayTeam: Team;
  homePlayers: Player[];
  awayPlayers: Player[];
  onClose: () => void;
}) {
  const [minute, setMinute] = useState("");
  const [teamId, setTeamId] = useState("");
  const [playerId, setPlayerId] = useState("");
  const [description, setDescription] = useState("");
  const [pending, startTransition] = useTransition();

  const players = teamId === homeTeam.id ? homePlayers : teamId === awayTeam.id ? awayPlayers : [];

  function confirm() {
    if (!minute) return;
    startTransition(async () => {
      await addMatchEvent(matchId, type, minute, teamId || null, playerId || null, description || null);
      onClose();
    });
  }

  return (
    <Modal onClose={onClose}>
      <div className="mb-4 flex items-center justify-between">
        <h3 className="font-display text-base font-semibold">{label}</h3>
        <button onClick={onClose} className="text-white/40 hover:text-white">
          <X size={18} />
        </button>
      </div>

      <div className="flex flex-col gap-3">
        <label className="flex flex-col gap-1.5">
          <span className="text-[11px] font-medium text-white/40">Minute</span>
          <input
            value={minute}
            onChange={(e) => setMinute(e.target.value)}
            placeholder="e.g. 63"
            autoFocus
            className="h-11 rounded-lg border border-white/10 bg-white/5 px-3 text-sm focus:border-white/30 focus:outline-none"
          />
        </label>

        {needsTeamPlayer && (
          <>
            <label className="flex flex-col gap-1.5">
              <span className="text-[11px] font-medium text-white/40">Team</span>
              <div className="grid grid-cols-2 gap-1.5">
                {[homeTeam, awayTeam].map((t) => (
                  <button
                    key={t.id}
                    type="button"
                    onClick={() => {
                      setTeamId(t.id);
                      setPlayerId("");
                    }}
                    className={`truncate rounded-lg py-2 text-xs font-semibold ${
                      teamId === t.id ? "bg-white text-black" : "bg-white/5 text-white/50 hover:bg-white/10"
                    }`}
                  >
                    {t.name}
                  </button>
                ))}
              </div>
            </label>
            <label className="flex flex-col gap-1.5">
              <span className="text-[11px] font-medium text-white/40">Player (optional)</span>
              <select
                value={playerId}
                onChange={(e) => setPlayerId(e.target.value)}
                disabled={!teamId}
                className="h-11 rounded-lg border border-white/10 bg-white/5 px-3 text-sm focus:border-white/30 focus:outline-none disabled:opacity-40"
              >
                <option value="">— Unspecified —</option>
                {players.map((p) => (
                  <option key={p.id} value={p.id}>
                    {String(p.number).padStart(2, "0")} - {p.full_name}
                  </option>
                ))}
              </select>
            </label>
          </>
        )}

        <label className="flex flex-col gap-1.5">
          <span className="text-[11px] font-medium text-white/40">Note (optional)</span>
          <input
            value={description}
            onChange={(e) => setDescription(e.target.value)}
            className="h-11 rounded-lg border border-white/10 bg-white/5 px-3 text-sm focus:border-white/30 focus:outline-none"
          />
        </label>

        <button
          type="button"
          onClick={confirm}
          disabled={!minute || pending}
          className="mt-2 h-11 rounded-lg bg-white font-semibold text-black hover:brightness-95 disabled:opacity-40"
        >
          {pending ? "Adding..." : "Add to Timeline"}
        </button>
      </div>
    </Modal>
  );
}
