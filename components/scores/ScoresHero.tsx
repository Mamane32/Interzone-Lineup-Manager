"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { Radio, Trophy, Users } from "lucide-react";
import TeamCrest from "./TeamCrest";
import type { PublicScoreMatch } from "@/lib/public-scores";

function getParts(target: number) {
  const diff = Math.max(0, target - Date.now());
  return {
    days: Math.floor(diff / 86_400_000),
    hours: Math.floor((diff % 86_400_000) / 3_600_000),
    minutes: Math.floor((diff % 3_600_000) / 60_000),
    done: diff <= 0,
  };
}

/** Creole-labeled countdown to kickoff — a purpose-built variant for this Haitian Creole public surface rather than reusing components/ui/MatchCountdown.tsx, whose own doc comment reserves it for the (English-labeled) admin console. */
function NextMatchCountdown({ targetISO }: { targetISO: string }) {
  const target = new Date(targetISO).getTime();
  const [parts, setParts] = useState(() => getParts(target));

  useEffect(() => {
    const id = setInterval(() => setParts(getParts(target)), 30_000);
    return () => clearInterval(id);
  }, [target]);

  if (parts.done) return <span className="font-display text-sm font-bold text-brand-400">K ap kòmanse</span>;

  return (
    <div className="flex items-center gap-2.5 font-display text-sm font-bold tabular-nums text-white">
      {parts.days > 0 && <span>{parts.days}j</span>}
      <span>{String(parts.hours).padStart(2, "0")}è</span>
      <span>{String(parts.minutes).padStart(2, "0")}min</span>
    </div>
  );
}

/**
 * GGScoreLive home's Hero — the pitch-texture background is the app's one
 * deliberately football-specific motif (app/globals.css), previously only
 * used on the login screen's PlatformHero; this is the first place it's
 * used for the actual sport content instead of the SaaS marketing pitch.
 * Server-fetched props (org name, competition name, quick stats, next
 * match) come from the page — only the live countdown ticks client-side.
 */
export default function ScoresHero({
  organizationName,
  competitionName,
  liveCount,
  teamCount,
  nextMatch,
}: {
  organizationName: string;
  competitionName: string | null;
  liveCount: number;
  teamCount: number;
  nextMatch: PublicScoreMatch | null;
}) {
  return (
    <section className="pitch-texture relative overflow-hidden rounded-2xl border border-white/[0.07] bg-white/[0.02] p-5">
      <p className="eyebrow">{organizationName}</p>
      <h1 className="mt-1.5 text-balance font-display text-2xl font-black leading-tight tracking-tight text-white">
        {competitionName ?? "GGScoreLive"}
      </h1>

      <div className="mt-4 flex flex-wrap items-center gap-4">
        {liveCount > 0 && (
          <span className="flex items-center gap-1.5 text-xs font-semibold text-red-400">
            <Radio size={13} className="animate-pulse" /> {liveCount} match k ap jwe kounye a
          </span>
        )}
        {teamCount > 0 && (
          <span className="flex items-center gap-1.5 text-xs font-medium text-white/45">
            <Users size={13} /> {teamCount} ekip
          </span>
        )}
      </div>

      {nextMatch && (
        <Link
          href={`/match/${nextMatch.matchId}`}
          className="surface-panel mt-4 flex items-center justify-between gap-3 px-4 py-3 transition hover:border-brand-400/25"
        >
          <div className="flex items-center gap-2 text-xs font-semibold uppercase tracking-wide text-white/35">
            <Trophy size={13} /> Pwochen match
          </div>
          <div className="flex items-center gap-2.5">
            <TeamCrest name={nextMatch.homeTeam.name} logoUrl={nextMatch.homeTeam.logoUrl} size={24} />
            <span className="text-xs text-white/50">vs</span>
            <TeamCrest name={nextMatch.awayTeam.name} logoUrl={nextMatch.awayTeam.logoUrl} size={24} />
          </div>
          <NextMatchCountdown targetISO={`${nextMatch.matchDate}T${nextMatch.matchTime}`} />
        </Link>
      )}
    </section>
  );
}
