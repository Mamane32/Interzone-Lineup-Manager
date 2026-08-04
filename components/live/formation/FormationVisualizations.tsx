"use client";

import { useState } from "react";
import { Crown, LayoutGrid, ListChecks, ShieldCheck, Tv, Users, Users2 } from "lucide-react";
import PitchMarkings from "@/components/formation/PitchMarkings";
import BrandBar from "@/components/live/BrandBar";
import { getTheme } from "@/lib/team-theme";
import type { PlacedPlayer } from "@/lib/formations";
import type { BrandingConfiguration } from "@/lib/branding";
import type { Player } from "@/lib/types";

export type VisualizationMode = "pitch" | "starting-xi" | "bench" | "team-sheet" | "captain" | "goalkeeper" | "presentation";

const MODES: { value: VisualizationMode; label: string; icon: typeof LayoutGrid }[] = [
  { value: "pitch", label: "Tactical Formation", icon: LayoutGrid },
  { value: "starting-xi", label: "Starting XI", icon: ListChecks },
  { value: "bench", label: "Bench Players", icon: Users },
  { value: "team-sheet", label: "Team Sheet", icon: Users2 },
  { value: "captain", label: "Captain Highlight", icon: Crown },
  { value: "goalkeeper", label: "Goalkeeper Highlight", icon: ShieldCheck },
  { value: "presentation", label: "Coach Presentation", icon: Tv },
];

/**
 * Seven ways to look at the exact same tactical data — no separate fetch,
 * no separate state, every mode below reads the same `positions`/
 * `formation`/`team` the editor produced. Read-only: this is for viewing
 * and exporting what's already been placed, not a second place to edit it.
 */
export default function FormationVisualizations({
  teamName,
  formation,
  positions,
  substitutes,
  branding,
}: {
  teamName: string;
  formation: string;
  positions: PlacedPlayer[];
  substitutes: Player[];
  branding: BrandingConfiguration;
}) {
  const [mode, setMode] = useState<VisualizationMode>("pitch");
  const theme = getTheme(teamName);
  const captain = positions.find((p) => p.captain);
  const goalkeeper = positions.find((p) => p.goalkeeper);

  return (
    <div className="flex flex-col gap-4">
      <div className="flex flex-wrap gap-1.5 overflow-x-auto">
        {MODES.map((m) => (
          <button
            key={m.value}
            onClick={() => setMode(m.value)}
            className={`flex flex-none items-center gap-1.5 whitespace-nowrap rounded-lg px-3 py-2 text-xs font-semibold transition-colors ${
              mode === m.value ? "bg-brand-400 text-surface-950" : "bg-white/5 text-white/50 hover:bg-white/10 hover:text-white"
            }`}
          >
            <m.icon size={13} /> {m.label}
          </button>
        ))}
      </div>

      {mode === "pitch" && <ReadOnlyPitch positions={positions} theme={theme} />}

      {mode === "starting-xi" && (
        <ListView title="Starting XI" players={positions.map((p) => ({ number: p.shirtNumber, name: p.fullName, tag: p.tacticalPosition, captain: p.captain, goalkeeper: p.goalkeeper }))} />
      )}

      {mode === "bench" && (
        <ListView title="Bench Players" players={substitutes.map((p) => ({ number: p.number, name: p.full_name }))} empty="No substitutes recorded." />
      )}

      {mode === "team-sheet" && (
        <div className="surface-panel p-5">
          <div className="mb-4 flex items-center justify-between border-b border-white/[0.08] pb-4">
            <div>
              <p className="eyebrow">Official Team Sheet</p>
              <h3 className="mt-1 font-display text-xl font-semibold">{teamName}</h3>
            </div>
            <span className="rounded-full bg-white/5 px-3 py-1 text-xs font-semibold text-white/60">Formation {formation}</span>
          </div>
          <div className="grid gap-6 sm:grid-cols-2">
            <div>
              <p className="mb-2 text-xs font-semibold uppercase tracking-wide text-white/40">Starting XI</p>
              <RowList players={positions.map((p) => ({ number: p.shirtNumber, name: p.fullName, tag: p.tacticalPosition, captain: p.captain, goalkeeper: p.goalkeeper }))} />
            </div>
            <div>
              <p className="mb-2 text-xs font-semibold uppercase tracking-wide text-white/40">Substitutes</p>
              <RowList players={substitutes.map((p) => ({ number: p.number, name: p.full_name }))} empty="None recorded." />
            </div>
          </div>
        </div>
      )}

      {mode === "captain" && (
        <SpotlightPitch positions={positions} theme={theme} highlight={captain} label="Captain" empty="No captain assigned yet." />
      )}

      {mode === "goalkeeper" && (
        <SpotlightPitch positions={positions} theme={theme} highlight={goalkeeper} label="Goalkeeper" empty="No goalkeeper assigned yet." />
      )}

      {mode === "presentation" && <CoachPresentation teamName={teamName} formation={formation} positions={positions} theme={theme} branding={branding} />}
    </div>
  );
}

function ReadOnlyPitch({ positions, theme }: { positions: PlacedPlayer[]; theme: ReturnType<typeof getTheme> }) {
  return (
    <div className="surface-panel relative mx-auto aspect-[2/3] w-full max-w-md overflow-hidden p-0">
      <PitchMarkings />
      {positions.map((p) => (
        <div key={p.playerId} className="absolute flex -translate-x-1/2 -translate-y-1/2 flex-col items-center gap-1" style={{ left: `${p.x}%`, top: `${p.y}%` }}>
          <div className={`flex h-9 w-9 items-center justify-center rounded-full border-2 font-display text-xs font-black shadow-lg ${p.goalkeeper ? "border-emerald-300 bg-emerald-500 text-emerald-950" : `${theme.border} ${theme.solid} ${theme.solidText}`}`}>
            {p.shirtNumber}
          </div>
        </div>
      ))}
    </div>
  );
}

function SpotlightPitch({
  positions,
  theme,
  highlight,
  label,
  empty,
}: {
  positions: PlacedPlayer[];
  theme: ReturnType<typeof getTheme>;
  highlight: PlacedPlayer | undefined;
  label: string;
  empty: string;
}) {
  if (!highlight) {
    return <div className="surface-panel p-10 text-center text-sm text-white/35">{empty}</div>;
  }
  return (
    <div className="surface-panel relative mx-auto aspect-[2/3] w-full max-w-md overflow-hidden p-0">
      <PitchMarkings />
      <div className="absolute inset-0 bg-black/55" />
      <div
        className="pointer-events-none absolute h-28 w-28 -translate-x-1/2 -translate-y-1/2 rounded-full bg-brand-400/25 blur-2xl"
        style={{ left: `${highlight.x}%`, top: `${highlight.y}%` }}
      />
      {positions.map((p) => {
        const isHighlight = p.playerId === highlight.playerId;
        return (
          <div
            key={p.playerId}
            className={`absolute flex -translate-x-1/2 -translate-y-1/2 flex-col items-center gap-1 transition-opacity ${isHighlight ? "z-10" : "opacity-30"}`}
            style={{ left: `${p.x}%`, top: `${p.y}%` }}
          >
            <div
              className={`flex items-center justify-center rounded-full border-2 font-display font-black shadow-lg ${
                isHighlight ? "h-14 w-14 border-amber-signal bg-amber-signal text-ink text-lg ring-4 ring-amber-signal/25" : `h-8 w-8 text-[10px] ${theme.border} ${theme.solid} ${theme.solidText}`
              }`}
            >
              {p.shirtNumber}
            </div>
            {isHighlight && (
              <span className="whitespace-nowrap rounded-full bg-amber-signal px-2.5 py-1 text-[10px] font-bold uppercase tracking-wide text-ink shadow">
                {label} · {p.fullName}
              </span>
            )}
          </div>
        );
      })}
    </div>
  );
}

export function CoachPresentation({
  teamName,
  formation,
  positions,
  theme,
  branding,
}: {
  teamName: string;
  formation: string;
  positions: PlacedPlayer[];
  theme: ReturnType<typeof getTheme>;
  branding: BrandingConfiguration;
}) {
  return (
    <div className={`surface-panel overflow-hidden bg-gradient-to-br ${theme.heroFrom} ${theme.heroTo} p-0`}>
      <div className="bg-black/40 p-6 sm:p-8">
        <p className="text-xs font-bold uppercase tracking-[0.25em] text-white/60">Starting XI</p>
        <h2 className="mt-1 font-display text-3xl font-black tracking-tight text-white sm:text-4xl">{teamName}</h2>
        <p className="mt-1 text-sm font-medium text-white/50">Formation {formation}</p>

        <div className="mt-6 grid grid-cols-1 gap-2 sm:grid-cols-2">
          {positions.map((p) => (
            <div key={p.playerId} className="flex items-center gap-3 rounded-xl bg-black/25 px-3 py-2.5 backdrop-blur-sm">
              <span className={`flex h-8 w-8 flex-none items-center justify-center rounded-full font-display text-xs font-black ${p.goalkeeper ? "bg-emerald-400 text-emerald-950" : `${theme.solid} ${theme.solidText}`}`}>
                {p.shirtNumber}
              </span>
              <span className="flex-1 truncate text-sm font-semibold text-white">{p.fullName}</span>
              {p.captain && <span className="rounded bg-amber-signal px-1.5 py-0.5 text-[9px] font-bold text-ink">C</span>}
              {p.goalkeeper && <span className="rounded bg-emerald-400 px-1.5 py-0.5 text-[9px] font-bold text-emerald-950">GK</span>}
              <span className="text-[10px] font-medium text-white/40">{p.tacticalPosition}</span>
            </div>
          ))}
        </div>

        <div className="mt-6 border-t border-white/10 pt-4">
          <BrandBar branding={branding} compact />
        </div>
      </div>
    </div>
  );
}

function RowList({
  players,
  empty = "None.",
}: {
  players: { number: number; name: string; tag?: string; captain?: boolean; goalkeeper?: boolean }[];
  empty?: string;
}) {
  if (players.length === 0) return <p className="text-xs text-white/30">{empty}</p>;
  return (
    <div className="flex flex-col gap-1.5">
      {players.map((p) => (
        <div key={`${p.number}-${p.name}`} className="flex items-center gap-2.5 text-sm">
          <span className="flex h-6 w-6 flex-none items-center justify-center rounded-full bg-white/10 text-[10px] font-bold">{p.number}</span>
          <span className="flex-1 truncate text-white/80">{p.name}</span>
          {p.tag && <span className="text-[10px] text-white/25">{p.tag}</span>}
          {p.captain && <span className="text-[9px] font-bold text-amber-signal">C</span>}
          {p.goalkeeper && <span className="text-[9px] font-bold text-emerald-400">GK</span>}
        </div>
      ))}
    </div>
  );
}

function ListView({
  title,
  players,
  empty = "None.",
}: {
  title: string;
  players: { number: number; name: string; tag?: string; captain?: boolean; goalkeeper?: boolean }[];
  empty?: string;
}) {
  return (
    <div className="surface-panel p-5">
      <div className="mb-3 flex items-center justify-between">
        <p className="text-xs font-semibold uppercase tracking-wide text-white/40">{title}</p>
        <span className="rounded-full bg-status-submitted/10 px-2 py-0.5 text-[10px] font-semibold text-status-submitted">Starting</span>
      </div>
      <RowList players={players} empty={empty} />
    </div>
  );
}
