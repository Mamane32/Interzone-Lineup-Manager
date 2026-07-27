"use client";

import { useState, useTransition } from "react";
import { Undo2, ChevronRight } from "lucide-react";
import GoalDialog from "./GoalDialog";
import EventDialog from "./EventDialog";
import ConfirmDialog from "./ConfirmDialog";
import { setLiveStatus, undoLastEvent } from "@/app/live/[matchId]/actions";
import type { MatchEventType, MatchLiveStatus, Player, Team } from "@/lib/types";

type QuickAction =
  | { kind: "goal" }
  | { kind: "event"; type: MatchEventType; label: string; needsTeamPlayer: boolean }
  | { kind: "status"; status: MatchLiveStatus; label: string; confirm?: boolean };

const ACTIONS: (QuickAction & { display: string })[] = [
  { kind: "goal", display: "⚽ Goal" },
  { kind: "event", type: "yellow_card", label: "Yellow Card", needsTeamPlayer: true, display: "🟨 Yellow Card" },
  { kind: "event", type: "red_card", label: "Red Card", needsTeamPlayer: true, display: "🟥 Red Card" },
  { kind: "event", type: "substitution", label: "Substitution", needsTeamPlayer: true, display: "🔁 Substitution" },
  { kind: "event", type: "var", label: "VAR", needsTeamPlayer: false, display: "📺 VAR" },
  { kind: "event", type: "penalty_missed", label: "Penalty", needsTeamPlayer: true, display: "🥅 Penalty" },
  { kind: "event", type: "var", label: "Additional Time", needsTeamPlayer: false, display: "➕ Additional Time" },
  { kind: "status", status: "half_time", label: "Half Time", display: "⏸️ Half Time" },
  { kind: "status", status: "full_time", label: "Full Time", display: "⏹️ End Match", confirm: true },
];

/**
 * Bottom Quick Controls / Quick Action Bar — the fastest-access production
 * buttons, meant to feel like the big physical buttons on a broadcast
 * console. Reuses the same GoalDialog / EventDialog / setLiveStatus as the
 * Left Control Panel — this is a second, faster entry point into the exact
 * same underlying actions, not a separate system.
 */
export default function QuickControlsBar({
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
  const [goalPickerOpen, setGoalPickerOpen] = useState(false);
  const [activeEvent, setActiveEvent] = useState<Extract<QuickAction, { kind: "event" }> | null>(null);
  const [confirmingStatus, setConfirmingStatus] = useState<Extract<QuickAction, { kind: "status" }> | null>(null);
  const [confirmingUndo, setConfirmingUndo] = useState(false);
  const [pendingStatus, startStatusTransition] = useTransition();
  const [pendingUndo, startUndoTransition] = useTransition();

  function handle(action: QuickAction) {
    if (action.kind === "goal") {
      setGoalPickerOpen(true);
      return;
    }
    if (action.kind === "event") {
      setActiveEvent(action);
      return;
    }
    if (action.kind === "status") {
      if (action.confirm) {
        setConfirmingStatus(action);
        return;
      }
      startStatusTransition(() => {
        setLiveStatus(matchId, action.status);
      });
    }
  }

  function confirmStatusChange() {
    if (!confirmingStatus) return;
    startStatusTransition(() => {
      setLiveStatus(matchId, confirmingStatus.status);
      setConfirmingStatus(null);
    });
  }

  function undo() {
    startUndoTransition(() => {
      undoLastEvent(matchId);
      setConfirmingUndo(false);
    });
  }

  return (
    <>
      <div className="sticky bottom-0 z-20 mt-4 rounded-2xl border border-white/10 bg-[#0b0e13]/95 p-2.5 backdrop-blur">
        <div className="flex items-center gap-2 overflow-x-auto pb-1">
          {ACTIONS.map((a, i) => (
            <button
              key={i}
              onClick={() => handle(a)}
              disabled={pendingStatus}
              className="flex-none whitespace-nowrap rounded-xl bg-white/5 px-3.5 py-2.5 text-xs font-bold text-white/80 transition-all hover:bg-white/10 active:scale-95 disabled:opacity-30"
            >
              {a.display}
            </button>
          ))}
          <button
            onClick={() => setConfirmingUndo(true)}
            disabled={pendingUndo}
            className="flex flex-none items-center gap-1.5 whitespace-nowrap rounded-xl bg-red-500/15 px-3.5 py-2.5 text-xs font-bold text-red-400 transition-all hover:bg-red-500/25 active:scale-95 disabled:opacity-30"
          >
            <Undo2 size={13} /> Undo Last Action
          </button>
        </div>
      </div>

      {confirmingStatus && (
        <ConfirmDialog
          title={`${confirmingStatus.label}?`}
          body="This changes the match status for everyone viewing the Broadcast Control Center. This action can be reversed manually from Match Status Controls if needed."
          confirmLabel={confirmingStatus.label}
          pending={pendingStatus}
          onConfirm={confirmStatusChange}
          onClose={() => setConfirmingStatus(null)}
        />
      )}

      {confirmingUndo && (
        <ConfirmDialog
          title="Undo last action?"
          body="This removes the most recent timeline event. If it was a goal, the score will be corrected too."
          confirmLabel="Undo"
          pending={pendingUndo}
          onConfirm={undo}
          onClose={() => setConfirmingUndo(false)}
        />
      )}

      {goalPickerOpen && (
        <QuickGoalTeamPicker
          homeTeam={homeTeam}
          awayTeam={awayTeam}
          onClose={() => setGoalPickerOpen(false)}
          matchId={matchId}
          homePlayers={homePlayers}
          awayPlayers={awayPlayers}
        />
      )}

      {activeEvent && (
        <EventDialog
          matchId={matchId}
          type={activeEvent.type}
          label={activeEvent.label}
          needsTeamPlayer={activeEvent.needsTeamPlayer}
          homeTeam={homeTeam}
          awayTeam={awayTeam}
          homePlayers={homePlayers}
          awayPlayers={awayPlayers}
          onClose={() => setActiveEvent(null)}
        />
      )}
    </>
  );
}

/** The Quick Action Bar's Goal button needs a team pick before the usual GoalDialog. */
function QuickGoalTeamPicker({
  homeTeam,
  awayTeam,
  onClose,
  matchId,
  homePlayers,
  awayPlayers,
}: {
  homeTeam: Team;
  awayTeam: Team;
  onClose: () => void;
  matchId: string;
  homePlayers: Player[];
  awayPlayers: Player[];
}) {
  const [chosen, setChosen] = useState<Team | null>(null);

  if (chosen) {
    return (
      <GoalDialog
        matchId={matchId}
        team={chosen}
        opponent={chosen.id === homeTeam.id ? awayTeam : homeTeam}
        players={chosen.id === homeTeam.id ? homePlayers : awayPlayers}
        onClose={onClose}
      />
    );
  }

  return (
    <div className="fixed inset-0 z-40 flex items-end justify-center bg-black/60 p-4 sm:items-center" onClick={onClose}>
      <div
        className="animate-fade-up w-full max-w-sm rounded-2xl border border-white/10 bg-[#0b0e13] p-5"
        onClick={(e) => e.stopPropagation()}
      >
        <h3 className="mb-4 flex items-center gap-1.5 font-display text-base font-semibold">
          <ChevronRight size={16} /> Which team scored?
        </h3>
        <div className="grid grid-cols-2 gap-2">
          {[homeTeam, awayTeam].map((t) => (
            <button
              key={t.id}
              onClick={() => setChosen(t)}
              className="truncate rounded-xl bg-white/5 py-4 text-sm font-semibold hover:bg-white/10"
            >
              {t.name}
            </button>
          ))}
        </div>
      </div>
    </div>
  );
}
