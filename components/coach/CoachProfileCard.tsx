import Image from "next/image";
import Link from "next/link";
import { ChevronRight, Trophy } from "lucide-react";
import type { Theme } from "@/lib/team-theme";

/**
 * The Coach Portal's identity card — real photo when uploaded (Profile ->
 * upload a real image), team-branded initials otherwise. Used on the
 * dashboard; deliberately presentation-only, reads props, owns no state
 * and no data fetching of its own.
 */
export default function CoachProfileCard({
  token,
  coachName,
  teamName,
  competitionName,
  photoUrl,
  theme,
}: {
  token: string;
  coachName: string;
  teamName: string;
  competitionName: string | null;
  photoUrl: string | null;
  theme: Theme;
}) {
  const initials = coachName
    .split(/\s+/)
    .filter(Boolean)
    .slice(0, 2)
    .map((p) => p[0]?.toUpperCase())
    .join("");

  return (
    <Link
      href={`/team/${token}/profile`}
      className={`animate-fade-up flex items-center gap-3 overflow-hidden rounded-2xl bg-gradient-to-br ${theme.heroFrom} ${theme.heroTo} p-3.5 text-white shadow-sm transition-transform active:scale-[0.99]`}
    >
      <div className="relative h-12 w-12 flex-none overflow-hidden rounded-full bg-white/15 ring-2 ring-white/25">
        {photoUrl ? (
          <Image src={photoUrl} alt="" fill sizes="48px" className="object-cover" unoptimized />
        ) : (
          <span className="flex h-full w-full items-center justify-center font-display text-base font-bold">{initials}</span>
        )}
      </div>
      <div className="min-w-0 flex-1">
        <p className="truncate font-display text-sm font-semibold">{coachName}</p>
        <p className="flex items-center gap-1 truncate text-[11px] text-white/70">
          <Trophy size={11} /> {teamName}
          {competitionName ? ` · ${competitionName}` : ""}
        </p>
      </div>
      <ChevronRight size={16} className="flex-none text-white/50" />
    </Link>
  );
}
