"use client";

import { useEffect, useState, useTransition } from "react";
import {
  Undo2,
  ChevronRight,
  Goal as GoalIcon,
  Square,
  ArrowLeftRight,
  MonitorPlay,
  Target,
  Hourglass,
  Pause,
  Timer,
  CircleDot,
  Flag,
  type LucideIcon,
} from "lucide-react";
import Modal from "./Modal";
import GoalDialog from "./GoalDialog";
import EventDialog from "./EventDialog";
import ConfirmDialog from "./ConfirmDialog";
import { addMatchEvent, setLiveStatus, undoLastEvent } from "@/app/live/[matchId]/actions";
import { deriveCurrentMinuteValue } from "@/lib/match-clock";
import type { MatchEvent, MatchEventType, MatchLiveStatus, Player, Team } from "@/lib/types";

type QuickAction =
  | { kind: "goal" }
  | { kind: "event"; type: MatchEventType; label: string; needsTeamPlayer: boolean }
  | { kind: "status"; status: MatchLiveStatus; label: string; confirm?: boolean };

const EVENT_ACTIONS: (QuickAction & { icon: LucideIcon; iconClassName?: string; key: string })[] = [
  { kind: "goal", icon: GoalIcon, key: "g" },
  { kind: "event", type: "yellow_card", label: "Yellow Card", needsTeamPlayer: true, icon: Square, iconClassName: "fill-amber-400 text-amber-400", key: "y" },
  { kind: "event", type: "red_card", label: "Red Card", needsTeamPlayer: true, icon: Square, iconClassName: "fill-red-500 text-red-500", key: "r" },
  { kind: "event", type: "substitution", label: "Substitution", needsTeamPlayer: true, icon: ArrowLeftRight, key: "s" },
  { kind: "event", type: "var", label: "VAR", needsTeamPlayer: false, icon: MonitorPlay, key: "v" },
  { kind: "event", type: "penalty_missed", label: "Penalty", needsTeamPlayer: true, icon: Target, key: "p" },
  // Was a duplicate of VAR (both dispatched type: "var") until the Phase 4
  // Broadcast Ecosystem Review caught it — additional_time is now a real,
  // distinct event type (migration 011), not a mislabeled VAR click.
  { kind: "event", type: "additional_time", label: "Additional Time", needsTeamPlayer: false, icon: Hourglass, key: "a" },
];

const STATUS_ACTIONS: (Extract<QuickAction, { kind: "status" }> & { icon: LucideIcon; key: string })[] = [
  { kind: "status", status: "half_time", label: "Half Time", icon: Pause, key: "h" },
  { kind: "status", status: "extra_time", label: "Extra Time", icon: Timer, confirm: true, key: "x" },
  { kind: "status", status: "penalty_shootout", label: "Penalty Shootout", icon: CircleDot, confirm: true, key: "k" },
  { kind: "status", status: "full_time", label: "End Match", icon: Flag, confirm: true, key: "f" },
];

const UNDO_KEY = "u";

function actionLabel(a: QuickAction): string {
  return a.kind === "goal" ? "Goal" : a.label;
}

/**
 * Operator Shortcuts — the broadcast console's fastest-access row. Per the
 * Phase 4 Broadcast Philosophy ("if a workflow can be completed in one
 * click instead of three, choose the one-click workflow"), the two event
 * types with nothing to attribute — VAR, Additional Time — now log
 * directly on click instead of opening a dialog just to click "confirm" a
 * second time. Everything that genuinely needs a player (Goal, cards,
 * Substitution, Penalty) still opens its dialog — attribution is real
 * data, not friction — but the minute inside defaults to the current
 * minute (Task 56), so that dialog is "pick player, confirm," never "type
 * a minute."
 */
export default function QuickControlsBar({
  matchId,
  homeTeam,
  awayTeam,
  homePlayers,
  awayPlayers,
  status,
  events,
}: {
  matchId: string;
  homeTeam: Team;
  awayTeam: Team;
  homePlayers: Player[];
  awayPlayers: Player[];
  status: MatchLiveStatus;
  events: MatchEvent[];
}) {
  const [goalPickerOpen, setGoalPickerOpen] = useState(false);
  const [activeEvent, setActiveEvent] = useState<Extract<QuickAction, { kind: "event" }> | null>(null);
  const [confirmingStatus, setConfirmingStatus] = useState<Extract<QuickAction, { kind: "status" }> | null>(null);
  const [confirmingUndo, setConfirmingUndo] = useState(false);
  const [pendingStatus, startStatusTransition] = useTransition();
  const [pendingUndo, startUndoTransition] = useTransition();
  const [pendingQuickEvent, startQuickEventTransition] = useTransition();

  const currentMinute = deriveCurrentMinuteValue(status, events);
  const busy = pendingStatus || pendingQuickEvent;

  function handle(action: QuickAction) {
    if (action.kind === "goal") {
      setGoalPickerOpen(true);
      return;
    }
    if (action.kind === "event") {
      // Zero-attribution events fire immediately when a minute can be
      // derived — the true one-click case. If the match hasn't started
      // yet (no current minute), fall back to the dialog so the operator
      // can still supply one manually.
      if (!action.needsTeamPlayer && currentMinute) {
        startQuickEventTransition(() => {
          addMatchEvent(matchId, action.type, currentMinute, null, null, null);
        });
        return;
      }
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

  // Broadcast Experience: single-key shortcuts for every button on this
  // bar, matching the key hint each ShortcutButton already shows. Ignored
  // while typing anywhere (minute fields, notes, the preset-name input)
  // and while a modifier is held, so this never fights a normal text
  // input or a browser/OS shortcut. Disabled once any dialog is open —
  // the dialog's own inputs take over key handling then.
  useEffect(() => {
    function onKeyDown(e: KeyboardEvent) {
      if (e.metaKey || e.ctrlKey || e.altKey) return;
      const target = e.target as HTMLElement | null;
      if (target && (target.tagName === "INPUT" || target.tagName === "TEXTAREA" || target.tagName === "SELECT" || target.isContentEditable)) return;
      if (goalPickerOpen || activeEvent || confirmingStatus || confirmingUndo || busy) return;

      const key = e.key.toLowerCase();
      if (key === UNDO_KEY) {
        setConfirmingUndo(true);
        return;
      }
      const eventAction = EVENT_ACTIONS.find((a) => a.key === key);
      if (eventAction) {
        handle(eventAction);
        return;
      }
      const statusAction = STATUS_ACTIONS.find((a) => a.key === key);
      if (statusAction) handle(statusAction);
    }

    window.addEventListener("keydown", onKeyDown);
    return () => window.removeEventListener("keydown", onKeyDown);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [goalPickerOpen, activeEvent, confirmingStatus, confirmingUndo, busy, currentMinute]);

  return (
    <>
      <div className="surface-panel sticky bottom-0 z-20 mt-4 flex flex-col gap-2 p-3 shadow-[0_-20px_50px_-20px_rgba(0,0,0,0.6)]">
        <div className="flex items-center gap-4 overflow-x-auto pb-1">
          <ShortcutGroup label="Match Events">
            {EVENT_ACTIONS.map((a, i) => (
              <ShortcutButton key={i} icon={a.icon} iconClassName={a.iconClassName} label={actionLabel(a)} keyHint={a.key} onClick={() => handle(a)} disabled={busy} />
            ))}
          </ShortcutGroup>

          <span className="h-9 w-px flex-none bg-white/10" />

          <ShortcutGroup label="Match Status">
            {STATUS_ACTIONS.map((a, i) => (
              <ShortcutButton key={i} icon={a.icon} label={a.label} keyHint={a.key} onClick={() => handle(a)} disabled={busy} tone={a.confirm ? "danger" : "default"} />
            ))}
          </ShortcutGroup>

          <button
            onClick={() => setConfirmingUndo(true)}
            disabled={pendingUndo}
            className="relative ml-auto flex flex-none items-center gap-1.5 whitespace-nowrap rounded-xl bg-red-500/15 px-3.5 py-2.5 text-xs font-bold text-red-400 transition-all hover:-translate-y-0.5 hover:bg-red-500/25 active:scale-95 active:translate-y-0 disabled:opacity-30"
          >
            <Undo2 size={13} /> Undo Last Action
            <KeyBadge letter={UNDO_KEY} />
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
          status={status}
          events={events}
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
          status={status}
          events={events}
          onClose={() => setActiveEvent(null)}
        />
      )}
    </>
  );
}

function ShortcutGroup({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div className="flex flex-none flex-col gap-1">
      <span className="whitespace-nowrap text-[9px] font-bold uppercase tracking-[0.2em] text-white/25">{label}</span>
      <div className="flex flex-none items-center gap-1.5">{children}</div>
    </div>
  );
}

function ShortcutButton({
  icon: Icon,
  iconClassName,
  label,
  keyHint,
  onClick,
  disabled,
  tone = "default",
}: {
  icon: LucideIcon;
  iconClassName?: string;
  label: string;
  keyHint: string;
  onClick: () => void;
  disabled: boolean;
  tone?: "default" | "danger";
}) {
  return (
    <button
      onClick={onClick}
      disabled={disabled}
      className={`relative flex flex-none flex-col items-center gap-1 whitespace-nowrap rounded-xl px-4 py-2.5 text-[11px] font-bold transition-all hover:-translate-y-0.5 active:scale-95 active:translate-y-0 disabled:opacity-30 ${
        tone === "danger" ? "bg-red-500/10 text-red-300 hover:bg-red-500/20" : "bg-white/5 text-white/80 hover:bg-white/10"
      }`}
    >
      <Icon size={17} className={iconClassName} />
      {label}
      <KeyBadge letter={keyHint} />
    </button>
  );
}

/** The keyboard-shortcut hint every Operator Shortcuts button carries — same key the global listener above responds to, so the UI never claims a shortcut that doesn't work. */
function KeyBadge({ letter }: { letter: string }) {
  return (
    <span className="absolute -right-1 -top-1 flex h-4 w-4 items-center justify-center rounded bg-black/60 text-[9px] font-bold uppercase text-white/50 ring-1 ring-white/10">
      {letter}
    </span>
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
  status,
  events,
}: {
  homeTeam: Team;
  awayTeam: Team;
  onClose: () => void;
  matchId: string;
  homePlayers: Player[];
  awayPlayers: Player[];
  status: MatchLiveStatus;
  events: MatchEvent[];
}) {
  const [chosen, setChosen] = useState<Team | null>(null);

  if (chosen) {
    return (
      <GoalDialog
        matchId={matchId}
        team={chosen}
        opponent={chosen.id === homeTeam.id ? awayTeam : homeTeam}
        players={chosen.id === homeTeam.id ? homePlayers : awayPlayers}
        status={status}
        events={events}
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
