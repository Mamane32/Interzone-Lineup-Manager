"use client";

import { useCallback, useEffect, useRef, useState, useTransition } from "react";
import { Check, LayoutGrid, Save, Shirt, Users2 } from "lucide-react";
import PitchMarkings from "./PitchMarkings";
import PlayerToken from "./PlayerToken";
import { FORMATION_OPTIONS, getFormationSlots, type PlacedPlayer } from "@/lib/formations";
import { buildInitialPositions, type SlotAssignment } from "@/lib/formation-engine";
import type { SaveFormationResult } from "@/lib/tactical-formation";
import type { FormationName, Player, TacticalFormation, TacticalPosition } from "@/lib/types";
import type { Theme } from "@/lib/team-theme";

function clamp(value: number, min: number, max: number) {
  return Math.min(max, Math.max(min, value));
}

export type FormationPitchEditorTeam = {
  id: string;
  name: string;
  players: Player[];
  startingXi: string[];
  substituteIds: string[];
  captainId: string | null;
  saved: { formation: TacticalFormation | null; positions: TacticalPosition[] };
};

/**
 * The Formation Engine's one reusable rendering layer: the pitch, the
 * drag-and-drop player tokens, the formation selector, and the save flow.
 * This is the piece Coach, Admin, and Broadcast all compose — none of them
 * re-implement dragging, positioning, or the save call. It knows nothing
 * about roles or permissions; `canEdit` and `onSave` are supplied by
 * whichever role shell renders it (see components/live/formation/TacticalFormationBoard.tsx
 * for Admin/Broadcast's shell, app/team/[token]/(coach)/formation for Coach's).
 *
 * Two escape hatches exist for shells that need more than "just the
 * editor" without the editor needing to know why:
 *  - `onChange` mirrors live formation/positions upward — Broadcast's shell
 *    uses this to feed its Visualizations/Animation/vMix Export tabs from
 *    the same editing session, without those tabs living inside this file.
 *  - `applyExternal` lets a shell push a state change in from outside
 *    (Broadcast's Preset recall) without this component knowing what a
 *    "preset" is.
 */
export default function FormationPitchEditor({
  team,
  theme,
  canEdit,
  onSave,
  onChange,
  applyExternal,
  extraControls,
  emptyStateHint,
}: {
  team: FormationPitchEditorTeam;
  theme: Theme;
  /** False for a strictly read-only viewer (e.g. Broadcast) — see the Formation Engine's permission model. */
  canEdit: boolean;
  onSave: (formation: FormationName, positions: SlotAssignment[]) => Promise<SaveFormationResult>;
  onChange?: (formation: FormationName, positions: PlacedPlayer[]) => void;
  applyExternal?: { formation: FormationName; positions: PlacedPlayer[] } | null;
  extraControls?: React.ReactNode;
  emptyStateHint?: string;
}) {
  const [formation, setFormation] = useState<FormationName>(team.saved.formation?.formation ?? "4-4-2");
  const [positions, setPositions] = useState<PlacedPlayer[]>(() => buildInitialPositions(team, team.saved.formation?.formation ?? "4-4-2"));
  const [draggingId, setDraggingId] = useState<string | null>(null);
  const [pending, startSaving] = useTransition();
  const [saveMessage, setSaveMessage] = useState<string | null>(null);

  const pitchRef = useRef<HTMLDivElement>(null);
  const dragMovedRef = useRef(false);

  useEffect(() => {
    onChange?.(formation, positions);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [formation, positions]);

  useEffect(() => {
    if (!applyExternal) return;
    setFormation(applyExternal.formation);
    setPositions(applyExternal.positions);
    setSaveMessage(null);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [applyExternal]);

  function changeFormation(next: FormationName) {
    setFormation(next);
    const slots = getFormationSlots(next);
    setPositions((prev) =>
      prev.map((p, i) => {
        const slot = slots[i] ?? slots[slots.length - 1];
        return { ...p, slotKey: slot.slotKey, x: slot.x, y: slot.y, tacticalPosition: slot.tacticalPosition, goalkeeper: Boolean(slot.goalkeeper) };
      })
    );
    setSaveMessage(null);
  }

  const handleTokenPointerDown = useCallback(
    (playerId: string) => (e: React.PointerEvent) => {
      if (!canEdit) return;
      e.stopPropagation();
      dragMovedRef.current = false;
      setDraggingId(playerId);
      pitchRef.current?.setPointerCapture(e.pointerId);
    },
    [canEdit]
  );

  function handlePitchPointerMove(e: React.PointerEvent) {
    if (!draggingId || !pitchRef.current) return;
    const rect = pitchRef.current.getBoundingClientRect();
    const x = clamp(((e.clientX - rect.left) / rect.width) * 100, 2, 98);
    const y = clamp(((e.clientY - rect.top) / rect.height) * 100, 2, 98);
    dragMovedRef.current = true;
    setPositions((prev) => prev.map((p) => (p.playerId === draggingId ? { ...p, x, y } : p)));
  }

  function handlePitchPointerUp() {
    setDraggingId(null);
  }

  function toggleCaptain(playerId: string) {
    if (!canEdit) return;
    if (dragMovedRef.current) return; // this was a drag, not a tap
    setPositions((prev) => prev.map((p) => ({ ...p, captain: p.playerId === playerId ? !p.captain : false })));
  }

  function handleSave() {
    setSaveMessage(null);
    // Only slotKey/playerId/captain/x/y are sent — tacticalPosition,
    // goalkeeper, and shirt number are the engine's to derive, not this
    // client's to assert.
    const payload: SlotAssignment[] = positions.map((p) => ({
      slotKey: p.slotKey,
      playerId: p.playerId,
      captain: p.captain,
      x: p.x,
      y: p.y,
    }));
    startSaving(async () => {
      const result = await onSave(formation, payload);
      setSaveMessage(result.ok ? "Formation saved." : result.error);
    });
  }

  const substitutes = team.players.filter((p) => team.substituteIds.includes(p.id));

  return (
    <div className="flex flex-col gap-4">
      <div className="surface-panel flex flex-wrap items-center gap-3 p-3">
        <div className="flex items-center gap-2">
          <LayoutGrid size={15} className="text-white/30" />
          <select
            value={formation}
            onChange={(e) => changeFormation(e.target.value as FormationName)}
            disabled={!canEdit}
            className="h-10 rounded-xl border border-white/[0.08] bg-white/[0.035] px-3 text-sm font-semibold text-white focus:border-brand-400/60 focus:outline-none disabled:opacity-40 [&>option]:bg-surface-900 [&>option]:text-white"
          >
            {FORMATION_OPTIONS.map((f) => (
              <option key={f.value} value={f.value}>{f.label}</option>
            ))}
          </select>
        </div>

        {canEdit ? (
          <button
            onClick={handleSave}
            disabled={pending || positions.length === 0}
            className="ml-auto inline-flex items-center gap-2 rounded-xl bg-gradient-to-b from-brand-100 to-brand-400 px-4 py-2 text-sm font-semibold text-surface-950 shadow-glow transition hover:-translate-y-0.5 disabled:opacity-40"
          >
            <Save size={15} /> {pending ? "Saving..." : "Save Formation"}
          </button>
        ) : (
          <span className="ml-auto flex items-center gap-1.5 rounded-full bg-white/5 px-3 py-1.5 text-[11px] font-bold uppercase tracking-wide text-white/40">
            Read-only
          </span>
        )}
      </div>

      {saveMessage && (
        <p className={`flex items-center gap-2 rounded-lg px-3 py-2 text-sm font-medium ${saveMessage === "Formation saved." ? "bg-status-submitted/10 text-status-submitted" : "bg-status-correction/10 text-status-correction"}`}>
          <Check size={14} /> {saveMessage}
        </p>
      )}

      {positions.length === 0 ? (
        <div className="surface-panel flex flex-col items-center gap-3 p-12 text-center">
          <span className="flex h-12 w-12 items-center justify-center rounded-2xl border border-white/[0.08] bg-white/[0.035] text-white/35"><Shirt size={22} /></span>
          <p className="text-sm font-medium text-white/70">No Starting XI to place yet</p>
          <p className="max-w-sm text-xs text-white/35">
            {emptyStateHint ?? `${team.name} hasn't submitted a lineup for this match. Formations auto-place from the submitted Starting XI — once it's in, come back here.`}
          </p>
        </div>
      ) : (
        <div className="grid gap-4 lg:grid-cols-[1fr_260px]">
          <div
            ref={pitchRef}
            onPointerMove={handlePitchPointerMove}
            onPointerUp={handlePitchPointerUp}
            className="surface-panel relative mx-auto aspect-[2/3] w-full max-w-xl touch-none overflow-hidden p-0"
          >
            <PitchMarkings />
            {positions.map((p) => (
              <PlayerToken
                key={p.playerId}
                player={p}
                theme={theme}
                dragging={draggingId === p.playerId}
                onPointerDown={handleTokenPointerDown(p.playerId)}
                onClick={() => toggleCaptain(p.playerId)}
              />
            ))}
          </div>

          <div className="flex flex-col gap-4">
            <div className="surface-panel p-4">
              <p className="mb-3 flex items-center gap-2 text-xs font-semibold uppercase tracking-wide text-white/40">
                <Users2 size={14} /> Starting XI
              </p>
              <div className="flex flex-col gap-1.5">
                {positions.map((p) => (
                  <div key={p.playerId} className="flex items-center gap-2 text-xs">
                    <span className="flex h-5 w-5 flex-none items-center justify-center rounded-full bg-white/10 text-[10px] font-bold">{p.shirtNumber}</span>
                    <span className="flex-1 truncate text-white/75">{p.fullName}</span>
                    <span className="text-[10px] text-white/25">{p.tacticalPosition}</span>
                    {p.captain && <span className="text-[9px] font-bold text-amber-signal">C</span>}
                  </div>
                ))}
              </div>
            </div>

            {substitutes.length > 0 && (
              <div className="surface-panel p-4">
                <p className="mb-3 text-xs font-semibold uppercase tracking-wide text-white/40">Bench</p>
                <div className="flex flex-col gap-1.5">
                  {substitutes.map((p) => (
                    <div key={p.id} className="flex items-center gap-2 text-xs text-white/40">
                      <span className="flex h-5 w-5 flex-none items-center justify-center rounded-full bg-white/5 text-[10px] font-bold">{p.number}</span>
                      <span className="truncate">{p.full_name}</span>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {canEdit && extraControls}

            <p className="rounded-lg bg-white/[0.03] px-3 py-2 text-[10px] leading-5 text-white/30">
              {canEdit
                ? "Drag any player to fine-tune position. Tap a player to make them captain. Switching formation keeps every player, only repositions them."
                : "This view is read-only."}
            </p>
          </div>
        </div>
      )}
    </div>
  );
}
