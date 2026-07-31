"use client";

import { useState, useTransition } from "react";
import { Plus, Undo2, Pencil, X } from "lucide-react";
import Modal from "./Modal";
import GoalDialog from "./GoalDialog";
import { deleteMatchEvent, setManualScore } from "@/app/live/[matchId]/actions";
import type { MatchEvent, Player, Team } from "@/lib/types";

export default function ScoreControl({
  matchId,
  homeTeam,
  awayTeam,
  homeScore,
  awayScore,
  homePlayers,
  awayPlayers,
  events,
}: {
  matchId: string;
  homeTeam: Team;
  awayTeam: Team;
  homeScore: number;
  awayScore: number;
  homePlayers: Player[];
  awayPlayers: Player[];
  events: MatchEvent[];
}) {
  const [dialogTeam, setDialogTeam] = useState<"home" | "away" | null>(null);
  const [editingScore, setEditingScore] = useState(false);
  const [pending, startTransition] = useTransition();

  const lastGoal = [...events].reverse().find((e) => e.type === "goal" || e.type === "penalty_goal" || e.type === "own_goal");

  function undoLastGoal() {
    if (!lastGoal) return;
    startTransition(() => {
      deleteMatchEvent(matchId, lastGoal.id);
    });
  }

  return (
    <div className="surface-panel p-4">
      <div className="mb-3 flex items-center justify-between">
        <h2 className="text-xs font-semibold uppercase tracking-wide text-white/40">Score Control</h2>
        <button
          type="button"
          onClick={() => setEditingScore(true)}
          className="flex items-center gap-1 text-[11px] text-white/40 hover:text-white"
        >
          <Pencil size={11} /> Manual edit
        </button>
      </div>

      <div className="grid grid-cols-2 gap-2">
        <GoalButton label={homeTeam.name} score={homeScore} onClick={() => setDialogTeam("home")} />
        <GoalButton label={awayTeam.name} score={awayScore} onClick={() => setDialogTeam("away")} />
      </div>

      <button
        type="button"
        onClick={undoLastGoal}
        disabled={!lastGoal || pending}
        className="mt-2 flex w-full items-center justify-center gap-1.5 rounded-lg bg-white/5 py-2 text-xs font-medium text-white/50 hover:bg-white/10 hover:text-white disabled:opacity-30"
      >
        <Undo2 size={13} /> Undo Last Goal
      </button>

      {dialogTeam && (
        <GoalDialog
          matchId={matchId}
          team={dialogTeam === "home" ? homeTeam : awayTeam}
          opponent={dialogTeam === "home" ? awayTeam : homeTeam}
          players={dialogTeam === "home" ? homePlayers : awayPlayers}
          onClose={() => setDialogTeam(null)}
        />
      )}

      {editingScore && (
        <ManualScoreDialog
          matchId={matchId}
          homeTeam={homeTeam}
          awayTeam={awayTeam}
          homeScore={homeScore}
          awayScore={awayScore}
          onClose={() => setEditingScore(false)}
        />
      )}
    </div>
  );
}

function GoalButton({ label, score, onClick }: { label: string; score: number; onClick: () => void }) {
  return (
    <button
      type="button"
      onClick={onClick}
      className="group surface-recessed flex flex-col items-center gap-1.5 py-3.5 transition-all hover:-translate-y-0.5 hover:bg-white/[0.04] active:scale-95 active:translate-y-0"
    >
      <span className="truncate px-1 text-[11px] font-medium text-white/50">{label}</span>
      <span className="font-display text-3xl font-black tabular-nums transition-colors group-hover:text-brand-100">{score}</span>
      <span className="flex items-center gap-1 rounded-full bg-red-500/15 px-2 py-0.5 text-[10px] font-bold text-red-400 transition-colors group-hover:bg-red-500 group-hover:text-white">
        <Plus size={10} /> GOAL
      </span>
    </button>
  );
}

function ManualScoreDialog({
  matchId,
  homeTeam,
  awayTeam,
  homeScore,
  awayScore,
  onClose,
}: {
  matchId: string;
  homeTeam: Team;
  awayTeam: Team;
  homeScore: number;
  awayScore: number;
  onClose: () => void;
}) {
  const [home, setHome] = useState(homeScore);
  const [away, setAway] = useState(awayScore);
  const [pending, startTransition] = useTransition();

  function confirm() {
    startTransition(async () => {
      await setManualScore(matchId, home, away);
      onClose();
    });
  }

  return (
    <Modal onClose={onClose}>
      <div className="mb-4 flex items-center justify-between">
        <h3 className="font-display text-base font-semibold">Manual Score Edit</h3>
        <button onClick={onClose} className="text-white/40 hover:text-white">
          <X size={18} />
        </button>
      </div>
      <div className="flex items-center justify-center gap-4">
        <ScoreStepper label={homeTeam.name} value={home} onChange={setHome} />
        <span className="font-display text-2xl text-white/30">–</span>
        <ScoreStepper label={awayTeam.name} value={away} onChange={setAway} />
      </div>
      <button
        type="button"
        onClick={confirm}
        disabled={pending}
        className="mt-5 h-11 w-full rounded-lg bg-red-500 font-semibold text-white hover:brightness-95 disabled:opacity-40"
      >
        Save Score
      </button>
    </Modal>
  );
}

function ScoreStepper({ label, value, onChange }: { label: string; value: number; onChange: (v: number) => void }) {
  return (
    <div className="flex flex-col items-center gap-2">
      <span className="max-w-[6rem] truncate text-xs text-white/50">{label}</span>
      <div className="flex items-center gap-2">
        <button
          type="button"
          onClick={() => onChange(Math.max(0, value - 1))}
          className="h-8 w-8 rounded-lg bg-white/10 font-bold hover:bg-white/20"
        >
          −
        </button>
        <span className="w-8 text-center font-display text-xl font-bold tabular-nums">{value}</span>
        <button type="button" onClick={() => onChange(value + 1)} className="h-8 w-8 rounded-lg bg-white/10 font-bold hover:bg-white/20">
          +
        </button>
      </div>
    </div>
  );
}
