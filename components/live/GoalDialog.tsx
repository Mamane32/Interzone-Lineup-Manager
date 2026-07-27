"use client";

import { useState, useTransition } from "react";
import { X } from "lucide-react";
import Modal from "./Modal";
import { addGoalEvent } from "@/app/live/[matchId]/actions";
import type { Player, Team } from "@/lib/types";

export type GoalType = "goal" | "penalty_goal" | "own_goal";

export default function GoalDialog({
  matchId,
  team,
  opponent,
  players,
  defaultType = "goal",
  onClose,
}: {
  matchId: string;
  team: Team;
  opponent: Team;
  players: Player[];
  defaultType?: GoalType;
  onClose: () => void;
}) {
  const [minute, setMinute] = useState("");
  const [playerId, setPlayerId] = useState("");
  const [type, setType] = useState<GoalType>(defaultType);
  const [pending, startTransition] = useTransition();

  function confirm() {
    if (!minute) return;
    startTransition(async () => {
      await addGoalEvent(matchId, team.id, opponent.id, type, minute, playerId || null, null);
      onClose();
    });
  }

  return (
    <Modal onClose={onClose}>
      <div className="mb-4 flex items-center justify-between">
        <h3 className="font-display text-base font-semibold">Goal — {team.name}</h3>
        <button onClick={onClose} className="text-white/40 hover:text-white">
          <X size={18} />
        </button>
      </div>

      <div className="flex flex-col gap-3">
        <Field label="Minute">
          <input
            value={minute}
            onChange={(e) => setMinute(e.target.value)}
            placeholder="e.g. 45+2"
            autoFocus
            className="h-11 w-full rounded-lg border border-white/10 bg-white/5 px-3 text-sm focus:border-white/30 focus:outline-none"
          />
        </Field>
        <Field label="Player (optional)">
          <select
            value={playerId}
            onChange={(e) => setPlayerId(e.target.value)}
            className="h-11 w-full rounded-lg border border-white/10 bg-white/5 px-3 text-sm focus:border-white/30 focus:outline-none"
          >
            <option value="">— Unspecified —</option>
            {players.map((p) => (
              <option key={p.id} value={p.id}>
                {String(p.number).padStart(2, "0")} - {p.full_name}
              </option>
            ))}
          </select>
        </Field>
        <Field label="Type">
          <div className="grid grid-cols-3 gap-1.5">
            {(["goal", "penalty_goal", "own_goal"] as GoalType[]).map((t) => (
              <button
                key={t}
                type="button"
                onClick={() => setType(t)}
                className={`rounded-lg py-2 text-[11px] font-semibold ${
                  type === t ? "bg-red-500 text-white" : "bg-white/5 text-white/50 hover:bg-white/10"
                }`}
              >
                {t === "goal" ? "Goal" : t === "penalty_goal" ? "Penalty" : "Own Goal"}
              </button>
            ))}
          </div>
        </Field>

        <button
          type="button"
          onClick={confirm}
          disabled={!minute || pending}
          className="mt-2 h-11 rounded-lg bg-red-500 font-semibold text-white hover:brightness-95 disabled:opacity-40"
        >
          {pending ? "Confirming..." : "Confirm Goal"}
        </button>
      </div>
    </Modal>
  );
}

function Field({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <label className="flex flex-col gap-1.5">
      <span className="text-[11px] font-medium text-white/40">{label}</span>
      {children}
    </label>
  );
}
