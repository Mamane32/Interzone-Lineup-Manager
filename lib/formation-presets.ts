"use client";

import type { PlacedPlayer } from "@/lib/formations";
import type { FormationName } from "@/lib/types";

/**
 * Broadcast Presets — deliberately browser-local (localStorage), not a
 * database table. The Tactical Formation schema is frozen at one saved
 * formation per (match, team); presets need *several* recallable layouts
 * per team, which that schema doesn't support. Rather than redesign a
 * frozen table, presets live here: real, working, instantly recallable
 * within this browser — just not yet synced across devices. A durable
 * version is a small additive migration (a `preset_name` column + relaxing
 * the unique constraint to include it) whenever that's wanted; not done
 * without sign-off, since the schema was explicitly frozen.
 */
export type FormationPreset = {
  name: string;
  formation: FormationName;
  positions: PlacedPlayer[];
  savedAt: string;
};

function storageKey(matchId: string, teamId: string): string {
  return `ggsp-formation-presets:${matchId}:${teamId}`;
}

export function listPresets(matchId: string, teamId: string): FormationPreset[] {
  if (typeof window === "undefined") return [];
  try {
    const raw = window.localStorage.getItem(storageKey(matchId, teamId));
    if (!raw) return [];
    const parsed = JSON.parse(raw) as FormationPreset[];
    return Array.isArray(parsed) ? parsed : [];
  } catch {
    return [];
  }
}

export function savePreset(matchId: string, teamId: string, preset: FormationPreset): FormationPreset[] {
  const next = [...listPresets(matchId, teamId).filter((p) => p.name !== preset.name), preset];
  window.localStorage.setItem(storageKey(matchId, teamId), JSON.stringify(next));
  return next;
}

export function removePreset(matchId: string, teamId: string, name: string): FormationPreset[] {
  const next = listPresets(matchId, teamId).filter((p) => p.name !== name);
  window.localStorage.setItem(storageKey(matchId, teamId), JSON.stringify(next));
  return next;
}

/** Common broadcast-preset names, offered as quick suggestions — not a fixed enum, the operator can name a preset anything. */
export const SUGGESTED_PRESET_NAMES = [
  "Official Formation",
  "Defensive Shape",
  "Attacking Shape",
  "Pressing Shape",
  "Build-Up Shape",
  "Set Pieces",
  "Counter Attack",
];
