import { CloudSun, MapPin, Users, Clock3, Trophy } from "lucide-react";
import { updateMatchHeaderInfo } from "@/app/live/[matchId]/actions";
import type { LiveMatchBundle } from "@/lib/live-match";

const STATUS_LABEL: Record<string, string> = {
  pre_match: "Pre Match",
  kickoff: "Kick Off",
  first_half: "First Half",
  half_time: "Half Time",
  second_half: "Second Half",
  extra_time: "Extra Time",
  penalty_shootout: "Penalties",
  full_time: "Full Time",
};

export default function MatchHeaderPanel({ bundle }: { bundle: LiveMatchBundle }) {
  const { match } = bundle;
  const status = match.live_status ?? "pre_match";

  return (
    <div className="overflow-hidden rounded-2xl border border-white/10 bg-gradient-to-b from-white/[0.06] to-transparent">
      <div className="flex items-center justify-between border-b border-white/10 px-5 py-2.5 text-[11px] uppercase tracking-wide text-white/40">
        <span className="flex items-center gap-1.5">
          <Trophy size={12} /> {match.competition?.name ?? "No competition"} {match.round ? `· ${match.round}` : ""}
        </span>
        <span>Season —</span>
      </div>

      <div className="grid grid-cols-3 items-center gap-2 px-5 py-6">
        <TeamColumn name={match.home_team.name} logo={match.home_team.logo_url} />
        <div className="flex flex-col items-center gap-1">
          <div className="font-display text-4xl font-black tabular-nums">
            {match.home_score ?? 0} <span className="text-white/20">–</span> {match.away_score ?? 0}
          </div>
          <span className="rounded-full bg-white/10 px-2.5 py-0.5 text-[10px] font-bold uppercase tracking-wide text-white/70">
            {STATUS_LABEL[status]}
          </span>
        </div>
        <TeamColumn name={match.away_team.name} logo={match.away_team.logo_url} align="right" />
      </div>

      <div className="grid grid-cols-2 gap-3 border-t border-white/10 px-5 py-3 text-xs text-white/50 sm:grid-cols-4">
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
            defaultValue={match.venue ?? ""}
            placeholder={`Teren ${match.home_team.name} (default)`}
            className="h-9 flex-1 rounded-lg border border-white/10 bg-white/5 px-3 text-sm text-white placeholder:text-white/30 focus:border-white/30 focus:outline-none"
          />
          <input
            name="refereeName"
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

function TeamColumn({ name, logo, align = "left" }: { name: string; logo: string | null; align?: "left" | "right" }) {
  return (
    <div className={`flex flex-col items-center gap-2 text-center ${align === "right" ? "" : ""}`}>
      {logo ? (
        // eslint-disable-next-line @next/next/no-img-element
        <img src={logo} alt="" className="h-14 w-14 rounded-full bg-white/10 object-cover ring-1 ring-white/15" />
      ) : (
        <div className="flex h-14 w-14 items-center justify-center rounded-full bg-white/10 font-display text-sm ring-1 ring-white/15">
          {name.slice(0, 2).toUpperCase()}
        </div>
      )}
      <span className="max-w-[8rem] truncate text-xs font-semibold text-white/90">{name}</span>
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
