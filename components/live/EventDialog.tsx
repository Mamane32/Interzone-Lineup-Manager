"use client";

import { useState, useTransition } from "react";
import { X } from "lucide-react";
import Modal from "./Modal";
import { addMatchEvent } from "@/app/live/[matchId]/actions";
import type { MatchEventType, Player, Team } from "@/lib/types";

export default function EventDialog({
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
                className="h-11 rounded-lg border border-white/10 bg-white/5 px-3 text-sm text-white focus:border-white/30 focus:outline-none disabled:opacity-40 [&>option]:bg-surface-900 [&>option]:text-white"
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
