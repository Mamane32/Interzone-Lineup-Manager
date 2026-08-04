"use client";

import { useState, useTransition } from "react";
import Image from "next/image";
import { Camera, Pencil, Trash2 } from "lucide-react";
import Button from "@/components/ui/Button";
import Input from "@/components/ui/Input";
import Select from "@/components/ui/Select";
import ConfirmActionDialog from "@/components/iam/ConfirmActionDialog";
import { JerseyBadge } from "@/components/ui/PlayerBadge";
import { useImageUpload } from "@/components/ui/useImageUpload";
import { PLAYER_POSITIONS, PREFERRED_FEET } from "@/lib/validation";
import {
  updatePlayer,
  setPlayerActive,
  setPlayerAvailability,
  deletePlayer,
  uploadPlayerPhoto,
} from "@/app/team/[token]/(coach)/roster/actions";
import type { Player, PlayerAvailabilityStatus } from "@/lib/types";

/**
 * Four visually distinct colors, per the roster mockup — reusing this
 * app's existing status palette (tailwind.config.ts) rather than
 * inventing new ones. Doubtful uses status-waiting (gold-yellow) instead
 * of amber-signal, specifically so it reads distinctly from Suspended's
 * brand-orange — amber-signal and brand-400 sit too close in hue to tell
 * apart as two different badge meanings.
 */
const AVAILABILITY_META: Record<PlayerAvailabilityStatus, { label: string; className: string }> = {
  available: { label: "Available", className: "bg-status-submitted/10 text-status-submitted" },
  doubtful: { label: "Doubtful", className: "bg-status-waiting/15 text-status-waiting" },
  injured: { label: "Injured", className: "bg-status-correction/10 text-status-correction" },
  suspended: { label: "Suspended", className: "bg-brand-500/15 text-brand-600" },
};

const COACH_SETTABLE = ["available", "doubtful", "injured"] as const;

export default function PlayerCard({ token, player }: { token: string; player: Player }) {
  const [editing, setEditing] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [pending, startTransition] = useTransition();

  const photoUpload = useImageUpload((fd) => uploadPlayerPhoto(token, player.id, fd), player.photo_url ?? null);

  const availability = player.availability_status ?? "available";
  const isActive = player.active !== false;

  function handleEditSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setError(null);
    const formData = new FormData(e.currentTarget);
    startTransition(async () => {
      const result = await updatePlayer(token, player.id, formData);
      if (!result.ok) {
        setError(result.error);
        return;
      }
      // Active/Inactive lives in the edit form now (moved off the main row
      // to match the mockup's compact card) — applied as its own call since
      // updatePlayer only touches the roster-detail fields.
      const activeInput = (e.currentTarget.elements.namedItem("active") as HTMLInputElement | null)?.checked ?? true;
      if (activeInput !== isActive) {
        await setPlayerActive(token, player.id, activeInput);
      }
      setEditing(false);
    });
  }

  function handleAvailability(status: string) {
    setError(null);
    startTransition(async () => {
      const result = await setPlayerAvailability(token, player.id, status);
      if (!result.ok) setError(result.error);
    });
  }

  async function handleDelete() {
    const result = await deletePlayer(token, player.id);
    if (!result.ok) setError(result.error);
    return result;
  }

  if (editing) {
    return (
      <form onSubmit={handleEditSubmit} className="flex flex-col gap-3 bg-coach-bg/60 p-4">
        <div className="grid grid-cols-3 gap-3">
          <Input name="number" type="number" min={1} defaultValue={player.number} required label="Number" tone="light" className="text-center" />
          <div className="col-span-2">
            <Input name="full_name" defaultValue={player.full_name} required label="Full name" tone="light" />
          </div>
        </div>
        <div className="grid grid-cols-2 gap-3">
          <Select name="position" tone="light" label="Position" defaultValue={player.position ?? ""}>
            <option value="">— None —</option>
            {PLAYER_POSITIONS.map((p) => (
              <option key={p} value={p}>
                {p}
              </option>
            ))}
          </Select>
          <Select name="preferred_foot" tone="light" label="Preferred foot" defaultValue={player.preferred_foot ?? ""}>
            <option value="">— None —</option>
            {PREFERRED_FEET.map((f) => (
              <option key={f} value={f}>
                {f}
              </option>
            ))}
          </Select>
        </div>
        <div className="flex flex-wrap items-center gap-5">
          <label className="flex items-center gap-2 text-sm font-medium text-ink/70">
            <input type="checkbox" name="is_captain" defaultChecked={Boolean(player.is_captain)} className="h-4.5 w-4.5 rounded border-2 border-coach-line" />
            Default captain
          </label>
          <label className="flex items-center gap-2 text-sm font-medium text-ink/70">
            <input type="checkbox" name="active" defaultChecked={isActive} className="h-4.5 w-4.5 rounded border-2 border-coach-line" />
            Active on roster
          </label>
        </div>
        {error && <p className="rounded-lg bg-status-correction/10 p-2.5 text-sm font-medium text-status-correction">{error}</p>}
        <div className="flex gap-2 pt-1">
          <Button type="submit" variant="coach" disabled={pending} className="flex-1">
            {pending ? "Saving..." : "Save"}
          </Button>
          <Button type="button" variant="secondary" onClick={() => setEditing(false)} className="flex-1">
            Cancel
          </Button>
        </div>
      </form>
    );
  }

  return (
    <div className={`relative flex items-center gap-3 p-4 ${!isActive ? "opacity-50" : ""}`}>
      <button
        type="button"
        onClick={() => photoUpload.inputRef.current?.click()}
        className="relative flex-none overflow-hidden rounded-full"
        aria-label="Change photo"
      >
        {photoUpload.preview ? (
          <span className="relative block h-10 w-10 overflow-hidden rounded-full ring-2 ring-amber-signal/40">
            <Image src={photoUpload.preview} alt="" fill sizes="40px" className="object-cover" unoptimized />
          </span>
        ) : (
          <JerseyBadge number={player.number} />
        )}
      </button>
      <input
        ref={photoUpload.inputRef}
        type="file"
        accept="image/*"
        className="hidden"
        onChange={(e) => {
          const file = e.target.files?.[0];
          if (file) photoUpload.handleFile(file, "photo");
        }}
      />

      <div className="min-w-0 flex-1">
        <p className="flex items-center gap-1.5 truncate font-display text-[15px] font-semibold text-ink">
          {player.full_name}
          {player.is_captain && (
            <span className="rounded-full bg-amber-signal/15 px-1.5 py-0.5 text-[9px] font-bold text-amber-signal">C</span>
          )}
        </p>
        <p className="truncate text-[13px] text-ink/45">
          {[player.position, player.preferred_foot ? `${player.preferred_foot} foot` : null].filter(Boolean).join(" · ") ||
            "No position set"}
        </p>
      </div>

      <div className="flex flex-none items-center gap-2">
        {availability === "suspended" ? (
          <span
            className={`rounded-full px-2.5 py-1 text-xs font-semibold ${AVAILABILITY_META.suspended.className}`}
            title="Suspended — set by competition administrator"
          >
            Suspended
          </span>
        ) : (
          <select
            value={availability}
            onChange={(e) => handleAvailability(e.target.value)}
            disabled={pending}
            aria-label={`${player.full_name}'s availability`}
            className={`h-7 cursor-pointer appearance-none rounded-full border-0 px-2.5 pr-2.5 text-xs font-semibold focus:outline-none focus:ring-2 focus:ring-status-submitted/30 [&>option]:bg-white [&>option]:text-ink ${AVAILABILITY_META[availability].className}`}
          >
            {COACH_SETTABLE.map((status) => (
              <option key={status} value={status} className="bg-white text-ink">
                {AVAILABILITY_META[status].label}
              </option>
            ))}
          </select>
        )}

        <button
          type="button"
          onClick={() => setEditing(true)}
          className="flex h-8 w-8 items-center justify-center rounded-lg bg-ink/5 text-ink/50 transition hover:bg-ink/10 hover:text-ink"
          aria-label="Edit player"
        >
          <Pencil size={14} />
        </button>
        <ConfirmActionDialog
          triggerLabel="Delete player"
          triggerVariant="danger"
          triggerIcon={<Trash2 size={14} />}
          title="Delete this player?"
          body={`${player.full_name} will be permanently removed from the roster. This cannot be undone.`}
          confirmLabel="Delete"
          action={handleDelete}
        />
      </div>

      {error && (
        <p className="absolute inset-x-4 top-full z-10 mt-1 rounded-lg bg-status-correction/10 p-2 text-xs font-medium text-status-correction">
          {error}
        </p>
      )}
    </div>
  );
}
