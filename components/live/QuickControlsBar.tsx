"use client";

import { useState, useTransition } from "react";
import { Undo2, ChevronRight } from "lucide-react";
import Modal from "./Modal";
import GoalDialog from "./GoalDialog";
import EventDialog from "./EventDialog";
import ConfirmDialog from "./ConfirmDialog";
import { setLiveStatus, undoLastEvent } from "@/app/live/[matchId]/actions";
import type { MatchEventType, MatchLiveStatus, Player, Team } from "@/lib/types";

type QuickAction =
  | { kind: "goal" }
  | { kind: "event"; type: MatchEventType; label: string; needsTeamPlayer: boolean }
  | { kind: "status"; status: MatchLiveStatus; label: string; confirm?: boolean };

const EVENT_ACTIONS: (QuickAction & { display: string })[] = [
  { kind: "goal", display: "⚽ Goal" },
  { kind: "event", type: "yellow_card", label: "Yellow Card", needsTeamPlayer: true, display: "🟨 Yellow Card" },
  { kind: "event", type: "red_card", label: "Red Card", needsTeamPlayer: true, display: "🟥 Red Card" },
  { kind: "event", type: "substitution", label: "Substitution", needsTeamPlayer: true, display: "🔁 Substitution" },
  { kind: "event", type: "var", label: "VAR", needsTeamPlayer: false, display: "📺 VAR" },
  { kind: "event", type: "penalty_missed", label: "Penalty", needsTeamPlayer: true, display: "🥅 Penalty" },
  { kind: "event", type: "var", label: "Additional Time", needsTeamPlayer: false, display: "➕ Additional Time" },
];

const STATUS_ACTIONS: (Extract<QuickAction, { kind: "status" }> & { display: string })[] = [
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
      <div className="surface-panel sticky bottom-0 z-20 mt-4 p-2.5 shadow-[0_-20px_50px_-20px_rgba(0,0,0,0.6)]">
        <div className="flex items-center gap-3 overflow-x-auto pb-1">
          <span className="flex-none whitespace-nowrap text-[9px] font-bold uppercase tracking-[0.2em] text-white/25">Operator Shortcuts</span>
          <div className="flex flex-none items-center gap-1.5">
            {EVENT_ACTIONS.map((a, i) => (
              <button
                key={i}
                onClick={() => handle(a)}
                disabled={pendingStatus}
                className="flex-none whitespace-nowrap rounded-xl bg-white/5 px-3.5 py-2.5 text-xs font-bold text-white/80 transition-all hover:-translate-y-0.5 hover:bg-white/10 active:scale-95 active:translate-y-0 disabled:opacity-30"
              >
                {a.display}
              </button>
            ))}
          </div>
          <span className="h-6 w-px flex-none bg-white/10" />
          <div className="flex flex-none items-center gap-1.5">
            {STATUS_ACTIONS.map((a, i) => (
              <button
                key={i}
                onClick={() => handle(a)}
                disabled={pendingStatus}
                className={`flex-none whitespace-nowrap rounded-xl px-3.5 py-2.5 text-xs font-bold transition-all hover:-translate-y-0.5 active:scale-95 active:translate-y-0 disabled:opacity-30 ${
                  a.confirm ? "bg-red-500/10 text-red-300 hover:bg-red-500/20" : "bg-white/5 text-white/80 hover:bg-white/10"
                }`}
              >
                {a.display}
              </button>
            ))}
          </div>
          <button
            onClick={() => setConfirmingUndo(true)}
            disabled={pendingUndo}
            className="ml-auto flex flex-none items-center gap-1.5 whitespace-nowrap rounded-xl bg-red-500/15 px-3.5 py-2.5 text-xs font-bold text-red-400 transition-all hover:-translate-y-0.5 hover:bg-red-500/25 active:scale-95 active:translate-y-0 disabled:opacity-30"
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
    <Modal onClose={onClose}>
      <h3 className="mb-4 flex items-center gap-1.5 font-display text-base font-semibold">
        <ChevronRight size={16} /> Which team scored?
      </h3>
      <div className="grid grid-cols-2 gap-2">
        {[homeTeam, awayTeam].map((t) => (
          <button
            key={t.id}
            onClick={() => setChosen(t)}
            className="truncate rounded-xl bg-white/5 py-4 text-sm font-semibold transition hover:bg-white/10"
          >
            {t.name}
          </button>
        ))}
      </div>
    </Modal>
  );
}
