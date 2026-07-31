import { CloudSun, MapPin, Users, Clock3, Trophy, CalendarRange } from "lucide-react";
import { updateMatchHeaderInfo } from "@/app/live/[matchId]/actions";
import type { LiveMatchBundle } from "@/lib/live-match";
import type { BrandingConfiguration } from "@/lib/branding";

/**
 * Match Context Card — competition, round/matchday, season, kickoff,
 * venue, referee, weather placeholder. The score itself lives in
 * MatchScorePanel (the brief's "most important part of the screen"); this
 * card is the surrounding context, kept compact.
 */
export default function MatchHeaderPanel({ bundle, branding }: { bundle: LiveMatchBundle; branding: BrandingConfiguration }) {
  const { match } = bundle;

  return (
    <div className="surface-panel overflow-hidden">
      <div className="flex flex-wrap items-center justify-between gap-2 border-b border-white/10 px-5 py-2.5 text-[11px] uppercase tracking-wide text-white/40">
        <span className="flex items-center gap-1.5">
          <Trophy size={12} /> {branding.competitionName ?? "No competition"}
        </span>
        <div className="flex items-center gap-3">
          {branding.seasonName && (
            <span className="flex items-center gap-1">
              <CalendarRange size={12} /> {branding.seasonName}
            </span>
          )}
          <span>{match.round ? `Matchday: ${match.round}` : "Matchday —"}</span>
        </div>
      </div>

      <div className="grid grid-cols-2 gap-3 px-5 py-3 text-xs text-white/50 sm:grid-cols-4">
        <Info icon={<Clock3 size={13} />} label="Kickoff" value={match.match_time?.slice(0, 5)} />
        <Info icon={<MapPin size={13} />} label="Venue" value={match.venue || `Teren ${match.home_team.name}`} />
        <Info icon={<Users size={13} />} label="Referee" value={match.referee_name || "—"} />
        <Info icon={<CloudSun size={13} />} label="Weather" value="—" />
      </div>

      <details className="border-t border-white/10 px-5 py-3">
        <summary className="cursor-pointer text-xs font-medium text-white/40 hover:text-white/70">
          Edit venue / referee
        </summary>
        <form action={updateMatchHeaderInfo.bind(null, match.id)} className="mt-3 flex flex-wrap gap-2">
          <input
            name="venue"
            aria-label="Venue"
            defaultValue={match.venue ?? ""}
            placeholder={`Teren ${match.home_team.name} (default)`}
            className="h-9 flex-1 rounded-lg border border-white/10 bg-white/5 px-3 text-sm text-white placeholder:text-white/30 focus:border-white/30 focus:outline-none"
          />
          <input
            name="refereeName"
            aria-label="Referee name"
            defaultValue={match.referee_name ?? ""}
            placeholder="Referee name"
            className="h-9 flex-1 rounded-lg border border-white/10 bg-white/5 px-3 text-sm text-white placeholder:text-white/30 focus:border-white/30 focus:outline-none"
          />
          <button type="submit" className="h-9 rounded-lg bg-white/10 px-3 text-xs font-semibold text-white hover:bg-white/20">
            Save
          </button>
        </form>
      </details>
    </div>
  );
}

function Info({ icon, label, value }: { icon: React.ReactNode; label: string; value?: string | null }) {
  return (
    <div className="flex items-center gap-1.5">
      <span className="text-white/30">{icon}</span>
      <span>
        <span className="text-white/30">{label}: </span>
        <span className="text-white/70">{value || "—"}</span>
      </span>
    </div>
  );
}
