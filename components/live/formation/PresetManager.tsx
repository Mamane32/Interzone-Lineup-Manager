"use client";

import { useEffect, useState } from "react";
import { Bookmark, Trash2 } from "lucide-react";
import { listPresets, savePreset, removePreset, SUGGESTED_PRESET_NAMES, type FormationPreset } from "@/lib/formation-presets";
import type { PlacedPlayer } from "@/lib/formations";
import type { FormationName } from "@/lib/types";

/** Browser-local saved layouts — see lib/formation-presets.ts for why this isn't a database table. */
export default function PresetManager({
  matchId,
  teamId,
  formation,
  positions,
  onRecall,
}: {
  matchId: string;
  teamId: string;
  formation: FormationName;
  positions: PlacedPlayer[];
  onRecall: (preset: FormationPreset) => void;
}) {
  const [presets, setPresets] = useState<FormationPreset[]>([]);
  const [name, setName] = useState("");

  useEffect(() => {
    setPresets(listPresets(matchId, teamId));
  }, [matchId, teamId]);

  function handleSave() {
    const label = name.trim();
    if (!label || positions.length === 0) return;
    setPresets(savePreset(matchId, teamId, { name: label, formation, positions, savedAt: new Date().toISOString() }));
    setName("");
  }

  function handleRemove(presetName: string) {
    setPresets(removePreset(matchId, teamId, presetName));
  }

  return (
    <div className="surface-panel p-4">
      <div className="mb-3 flex items-center justify-between">
        <p className="flex items-center gap-2 text-xs font-semibold uppercase tracking-wide text-white/40">
          <Bookmark size={13} /> Broadcast Presets
        </p>
        <span className="rounded-full bg-white/5 px-2 py-0.5 text-[9px] font-semibold uppercase text-white/25">Saved in this browser</span>
      </div>

      <div className="mb-3 flex gap-2">
        <input
          value={name}
          onChange={(e) => setName(e.target.value)}
          onKeyDown={(e) => e.key === "Enter" && handleSave()}
          list="preset-suggestions"
          placeholder="Preset name..."
          className="h-9 flex-1 rounded-lg border border-white/[0.08] bg-white/[0.035] px-2.5 text-xs text-white placeholder:text-white/25 focus:border-brand-400/60 focus:outline-none"
        />
        <datalist id="preset-suggestions">
          {SUGGESTED_PRESET_NAMES.map((n) => (
            <option key={n} value={n} />
          ))}
        </datalist>
        <button
          onClick={handleSave}
          disabled={!name.trim() || positions.length === 0}
          className="rounded-lg bg-white/5 px-3 text-xs font-semibold text-white/70 transition hover:bg-white/10 hover:text-white disabled:opacity-30"
        >
          Save
        </button>
      </div>

      {presets.length === 0 ? (
        <p className="text-[11px] text-white/25">No presets saved yet for this team.</p>
      ) : (
        <div className="flex flex-col gap-1.5">
          {presets.map((p) => (
            <div key={p.name} className="flex items-center gap-2 rounded-lg bg-white/[0.02] px-2.5 py-2">
              <button onClick={() => onRecall(p)} className="flex-1 truncate text-left text-xs font-medium text-white/75 hover:text-brand-400">
                {p.name}
              </button>
              <span className="text-[9px] text-white/20">{p.formation}</span>
              <button onClick={() => handleRemove(p.name)} className="text-white/20 hover:text-status-correction" aria-label={`Remove ${p.name}`}>
                <Trash2 size={12} />
              </button>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
