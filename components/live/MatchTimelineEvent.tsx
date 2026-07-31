"use client";

import { useState, useTransition } from "react";
import Image from "next/image";
import { Pencil, Trash2, X } from "lucide-react";
import Modal from "./Modal";
import { deleteMatchEvent, updateMatchEvent } from "@/app/live/[matchId]/actions";
import { getTheme } from "@/lib/team-theme";
import type { MatchEvent, MatchEventType, Player, Team } from "@/lib/types";

export const EVENT_META: Record<MatchEventType, { icon: string; label: string }> = {
  goal: { icon: "⚽", label: "Goal" },
  penalty_goal: { icon: "⚽", label: "Penalty Goal" },
  own_goal: { icon: "⚽", label: "Own Goal" },
  yellow_card: { icon: "🟨", label: "Yellow Card" },
  second_yellow: { icon: "🟨🟥", label: "Second Yellow" },
  red_card: { icon: "🟥", label: "Red Card" },
  substitution: { icon: "🔁", label: "Substitution" },
  var: { icon: "📺", label: "VAR" },
  penalty_missed: { icon: "❌", label: "Penalty Missed" },
  injury: { icon: "🩹", label: "Injury" },
  match_start: { icon: "▶️", label: "Match Start" },
  half_time: { icon: "⏸️", label: "Half Time" },
  match_resume: { icon: "▶️", label: "Match Resume" },
  match_end: { icon: "⏹️", label: "Match End" },
};

export default function MatchTimelineEvent({
  matchId,
  event,
  player,
  team,
  homeTeam,
  awayTeam,
  homePlayers,
  awayPlayers,
  index = 0,
}: {
  matchId: string;
  event: MatchEvent;
  player: Player | null;
  team: Team | null;
  homeTeam: Team;
  awayTeam: Team;
  homePlayers: Player[];
  awayPlayers: Player[];
  index?: number;
}) {
  const [editing, setEditing] = useState(false);
  const [pending, startTransition] = useTransition();
  const meta = EVENT_META[event.type];
  const theme = team ? getTheme(team.name) : null;
  const isHome = team?.id === homeTeam.id;
  const isAway = team?.id === awayTeam.id;

  function remove() {
    startTransition(() => {
      deleteMatchEvent(matchId, event.id);
    });
  }

  return (
    <div
      style={{ "--stagger": Math.min(index, 8) } as React.CSSProperties}
      className={`group animate-fade-up flex items-center gap-2.5 rounded-xl border-l-2 bg-white/[0.03] py-2 pl-2.5 pr-2 hover:bg-white/[0.06] ${
        isHome ? "border-l-blue-500" : isAway ? "border-l-red-500" : "border-l-white/10"
      }`}
    >
      <span className="w-9 flex-none text-center font-display text-xs font-bold text-white/50">{event.minute}&apos;</span>
      <span className="text-base leading-none">{meta.icon}</span>

      {team && (
        team.logo_url ? (
          <Image src={team.logo_url} alt="" width={20} height={20} className={`h-5 w-5 flex-none rounded-full object-cover ring-1 ${theme?.ring ?? ""}`} />
        ) : (
          <span className={`flex h-5 w-5 flex-none items-center justify-center rounded-full text-[8px] font-bold ${theme?.chipBg ?? "bg-white/10"} ${theme?.chipText ?? "text-white/50"}`}>
            {team.name.slice(0, 2).toUpperCase()}
          </span>
        )
      )}

      <div className="min-w-0 flex-1">
        <p className="truncate text-xs font-semibold text-white/90">
          {meta.label}
          {team ? ` · ${team.name}` : ""}
        </p>
        {(player || event.description) && (
          <p className="truncate text-[11px] text-white/40">
            {player ? `${String(player.number).padStart(2, "0")} ${player.full_name}` : ""}
            {player && event.description ? " — " : ""}
            {event.description ?? ""}
          </p>
        )}
      </div>

      <div className="flex flex-none items-center gap-0.5 opacity-0 transition-opacity group-hover:opacity-100">
        <button
          type="button"
          onClick={() => setEditing(true)}
          className="rounded p-1 text-white/30 hover:text-white"
          aria-label="Edit event"
        >
          <Pencil size={12} />
        </button>
        <button
          type="button"
          onClick={remove}
          disabled={pending}
          className="rounded p-1 text-white/30 hover:text-red-400"
          aria-label="Remove event"
        >
          <Trash2 size={12} />
        </button>
      </div>

      {editing && (
        <EditEventDialog
          matchId={matchId}
          event={event}
          homeTeam={homeTeam}
          awayTeam={awayTeam}
          homePlayers={homePlayers}
          awayPlayers={awayPlayers}
          onClose={() => setEditing(false)}
        />
      )}
    </div>
  );
}

function EditEventDialog({
  matchId,
  event,
  homeTeam,
  awayTeam,
  homePlayers,
  awayPlayers,
  onClose,
}: {
  matchId: string;
  event: MatchEvent;
  homeTeam: Team;
  awayTeam: Team;
  homePlayers: Player[];
  awayPlayers: Player[];
  onClose: () => void;
}) {
  const [minute, setMinute] = useState(event.minute);
  const [teamId, setTeamId] = useState(event.team_id ?? "");
  const [playerId, setPlayerId] = useState(event.player_id ?? "");
  const [description, setDescription] = useState(event.description ?? "");
  const [pending, startTransition] = useTransition();

  const players = teamId === homeTeam.id ? homePlayers : teamId === awayTeam.id ? awayPlayers : [];

  function save() {
    startTransition(async () => {
      await updateMatchEvent(matchId, event.id, minute, teamId || null, playerId || null, description || null);
      onClose();
    });
  }

  return (
    <Modal onClose={onClose}>
      <div className="mb-4 flex items-center justify-between">
        <h3 className="font-display text-base font-semibold">Edit — {EVENT_META[event.type].label}</h3>
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
            className="h-11 rounded-lg border border-white/10 bg-white/5 px-3 text-sm focus:border-white/30 focus:outline-none"
          />
        </label>
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
          <span className="text-[11px] font-medium text-white/40">Player</span>
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
        <label className="flex flex-col gap-1.5">
          <span className="text-[11px] font-medium text-white/40">Note (also used for assist, e.g. &quot;Assist: J. Louis&quot;)</span>
          <input
            value={description}
            onChange={(e) => setDescription(e.target.value)}
            className="h-11 rounded-lg border border-white/10 bg-white/5 px-3 text-sm focus:border-white/30 focus:outline-none"
          />
        </label>
        <button
          type="button"
          onClick={save}
          disabled={pending}
          className="mt-2 h-11 rounded-lg bg-white font-semibold text-black hover:brightness-95 disabled:opacity-40"
        >
          {pending ? "Saving..." : "Save Changes"}
        </button>
      </div>
    </Modal>
  );
}
