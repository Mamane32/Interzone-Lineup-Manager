"use client";

import { useState } from "react";
import { addMinutes } from "@/lib/match-clock";

const FIXED_PRESETS = ["45", "90", "90+1", "90+2", "90+3", "105", "120"];
const RELATIVE_DELTAS = [1, 2, 3, 5];

/**
 * Replaces free-text minute entry (the Phase 4 review's primary Match
 * Operations finding: unvalidated text, retyped by hand for every event)
 * with the operator's actual fast path — presets first, a free-text
 * "Custom" field only for the rare case that needs it. Shared by every
 * dialog that logs a minute (GoalDialog, EventDialog) so there is exactly
 * one minute-entry experience, not one per dialog.
 */
export default function MinutePicker({
  value,
  onChange,
  currentMinute,
}: {
  value: string;
  onChange: (minute: string) => void;
  currentMinute: string | null;
}) {
  const [customOpen, setCustomOpen] = useState(false);

  const isCurrent = currentMinute !== null && value === currentMinute;

  function pick(next: string) {
    setCustomOpen(false);
    onChange(next);
  }

  return (
    <div className="flex flex-col gap-2">
      <div className="flex flex-wrap gap-1.5">
        {currentMinute !== null && (
          <PresetButton active={isCurrent} onClick={() => pick(currentMinute)} wide>
            Current Minute · {currentMinute}&apos;
          </PresetButton>
        )}
        {RELATIVE_DELTAS.map((d) => (
          <PresetButton
            key={d}
            active={false}
            disabled={currentMinute === null}
            onClick={() => pick(addMinutes(value || currentMinute || "0", d))}
          >
            +{d}
          </PresetButton>
        ))}
      </div>

      <div className="flex flex-wrap gap-1.5">
        {FIXED_PRESETS.map((p) => (
          <PresetButton key={p} active={value === p && !customOpen} onClick={() => pick(p)}>
            {p}&apos;
          </PresetButton>
        ))}
        <PresetButton active={customOpen} onClick={() => setCustomOpen(true)}>
          Custom
        </PresetButton>
      </div>

      {customOpen && (
        <input
          value={value}
          onChange={(e) => onChange(e.target.value)}
          placeholder="e.g. 37 or 45+4"
          autoFocus
          className="h-10 rounded-lg border border-white/10 bg-white/5 px-3 text-sm focus:border-white/30 focus:outline-none"
        />
      )}

      {!customOpen && (
        <p className="text-[11px] text-white/30">
          Selected: <span className="font-semibold text-white/60">{value ? `${value}'` : "—"}</span>
        </p>
      )}
    </div>
  );
}

function PresetButton({
  children,
  active,
  disabled,
  wide,
  onClick,
}: {
  children: React.ReactNode;
  active: boolean;
  disabled?: boolean;
  wide?: boolean;
  onClick: () => void;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      disabled={disabled}
      className={`rounded-lg px-3 py-2 text-xs font-bold transition-all active:scale-95 disabled:cursor-not-allowed disabled:opacity-30 ${
        wide ? "flex-1" : ""
      } ${active ? "bg-white text-black" : "bg-white/5 text-white/70 hover:bg-white/10"}`}
    >
      {children}
    </button>
  );
}
