"use client";

import { useState, useTransition } from "react";
import { ChevronRight, Plus } from "lucide-react";
import Modal from "./Modal";
import { addGoalEvent, setLiveStatus } from "@/app/live/[matchId]/actions";
import type { MatchLiveStatus, Team } from "@/lib/types";

const SEQUENCE: MatchLiveStatus[] = [
  "pre_match",
  "kickoff",
  "first_half",
  "half_time",
  "second_half",
  "extra_time",
  "penalty_shootout",
  "full_time",
];

const STATUS_LABEL: Record<MatchLiveStatus, string> = {
  pre_match: "Pre Match",
  kickoff: "Kick Off",
  first_half: "First Half",
  half_time: "Half Time",
  second_half: "Second Half",
  extra_time: "Extra Time",
  penalty_shootout: "Penalties",
  full_time: "Full Time",
};

export default function QuickControlsBar({
  matchId,
  homeTeam,
  awayTeam,
  currentStatus,
}: {
  matchId: string;
  homeTeam: Team;
  awayTeam: Team;
  currentStatus: MatchLiveStatus;
}) {
  const [goalTeam, setGoalTeam] = useState<Team | null>(null);
  const [pending, startTransition] = useTransition();

  const currentIndex = SEQUENCE.indexOf(currentStatus);
  const next = SEQUENCE[currentIndex + 1];

  function advance() {
    if (!next) return;
    startTransition(() => {
      setLiveStatus(matchId, next);
    });
  }

  return (
    <>
      <div className="sticky bottom-0 z-20 mt-4 flex items-center gap-2 rounded-2xl border border-white/10 bg-[#0b0e13]/95 p-2.5 backdrop-blur">
        <button
          onClick={() => setGoalTeam(homeTeam)}
          className="flex flex-1 items-center justify-center gap-1.5 rounded-xl bg-white/5 py-2.5 text-xs font-semibold text-white/80 hover:bg-white/10 active:scale-95"
        >
          <Plus size={13} /> {homeTeam.name}
        </button>
        <button
          onClick={() => setGoalTeam(awayTeam)}
          className="flex flex-1 items-center justify-center gap-1.5 rounded-xl bg-white/5 py-2.5 text-xs font-semibold text-white/80 hover:bg-white/10 active:scale-95"
        >
          <Plus size={13} /> {awayTeam.name}
        </button>
        <button
          onClick={advance}
          disabled={!next || pending}
          className="flex flex-[1.4] items-center justify-center gap-1.5 rounded-xl bg-red-500 py-2.5 text-xs font-bold text-white hover:brightness-95 disabled:opacity-30"
        >
          {next ? STATUS_LABEL[next] : "Match Over"} <ChevronRight size={13} />
        </button>
      </div>

      {goalTeam && (
        <QuickGoalDialog
          matchId={matchId}
          team={goalTeam}
          opponent={goalTeam.id === homeTeam.id ? awayTeam : homeTeam}
          onClose={() => setGoalTeam(null)}
        />
      )}
    </>
  );
}

function QuickGoalDialog({
  matchId,
  team,
  opponent,
  onClose,
}: {
  matchId: string;
  team: Team;
  opponent: Team;
  onClose: () => void;
}) {
  const [minute, setMinute] = useState("");
  const [pending, startTransition] = useTransition();

  function confirm() {
    if (!minute) return;
    startTransition(async () => {
      await addGoalEvent(matchId, team.id, opponent.id, "goal", minute, null, null);
      onClose();
    });
  }

  return (
    <Modal onClose={onClose}>
      <h3 className="mb-4 font-display text-base font-semibold">Goal — {team.name}</h3>
      <input
        value={minute}
        onChange={(e) => setMinute(e.target.value)}
        placeholder="Minute, e.g. 63"
        autoFocus
        className="h-11 w-full rounded-lg border border-white/10 bg-white/5 px-3 text-sm focus:border-white/30 focus:outline-none"
      />
      <button
        type="button"
        onClick={confirm}
        disabled={!minute || pending}
        className="mt-3 h-11 w-full rounded-lg bg-red-500 font-semibold text-white hover:brightness-95 disabled:opacity-40"
      >
        {pending ? "Confirming..." : "Confirm Goal"}
      </button>
    </Modal>
  );
}
