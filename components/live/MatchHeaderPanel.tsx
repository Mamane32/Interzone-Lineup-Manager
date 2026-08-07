import Image from "next/image";
import { CloudSun, MapPin, Clock3, Trophy, CalendarRange, Ticket, ShieldCheck, Building2, Radio } from "lucide-react";
import { updateMatchHeaderInfo } from "@/app/live/[matchId]/actions";
import type { LiveMatchBundle } from "@/lib/live-match";
import type { BrandingConfiguration } from "@/lib/branding";
import type { Venue } from "@/lib/types";

/**
 * Match Context Card — competition, round/matchday, kickoff, officiating
 * crew, stadium information, weather/attendance placeholders. The score
 * itself lives in MatchScorePanel; this card is the surrounding context.
 *
 * Stadium information reuses the real `venues` table (Foundation,
 * Sprint 1/2 — capacity, city, surface, an uploaded photo) via
 * `match.venue_record`, joined in lib/live-match.ts. `match.venue` (the
 * older free-text field) stays as the fallback for a match with no linked
 * venue record — nothing about it changes.
 *
 * Match officials are the plain nullable columns from migration 014 (a
 * match has one crew, not reusable entities, per product decision) —
 * only whichever roles are actually set render.
 */
export default function MatchHeaderPanel({
  bundle,
  branding,
  venues,
}: {
  bundle: LiveMatchBundle;
  branding: BrandingConfiguration;
  venues: Venue[];
}) {
  const { match } = bundle;
  const stadiumName = match.venue_record?.name || match.venue || `Teren ${match.home_team.name}`;

  const officials = [
    { label: "Referee", value: match.referee_name },
    { label: "Assistant 1", value: match.assistant_referee_1_name },
    { label: "Assistant 2", value: match.assistant_referee_2_name },
    { label: "Fourth Official", value: match.fourth_official_name },
    { label: "VAR", value: match.var_official_name },
  ].filter((o) => o.value);

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

      <div className="grid grid-cols-1 gap-4 px-5 py-4 sm:grid-cols-[1fr_auto]">
        {/* Stadium */}
        <div className="flex items-center gap-3">
          {match.venue_record?.photo_url ? (
            <Image
              src={match.venue_record.photo_url}
              alt=""
              width={56}
              height={56}
              className="h-14 w-14 flex-none rounded-lg object-cover ring-1 ring-white/10"
              unoptimized
            />
          ) : (
            <div className="flex h-14 w-14 flex-none items-center justify-center rounded-lg bg-white/5 text-white/25 ring-1 ring-white/10">
              <Building2 size={20} />
            </div>
          )}
          <div className="min-w-0">
            <p className="truncate text-sm font-semibold text-white/90">{stadiumName}</p>
            <p className="flex flex-wrap items-center gap-x-3 gap-y-0.5 text-[11px] text-white/40">
              <span className="flex items-center gap-1">
                <Clock3 size={11} /> {match.match_time?.slice(0, 5) || "—"}
              </span>
              {match.venue_record?.city && (
                <span className="flex items-center gap-1">
                  <MapPin size={11} /> {match.venue_record.city}
                </span>
              )}
              {match.venue_record?.capacity != null && <span>Capacity {match.venue_record.capacity.toLocaleString()}</span>}
            </p>
          </div>
        </div>

        {/* Weather / Attendance placeholders */}
        <div className="flex items-center gap-2">
          <PlaceholderChip icon={<CloudSun size={12} />} label="Weather" />
          <PlaceholderChip icon={<Ticket size={12} />} label="Attendance" />
        </div>
      </div>

      {/* Match officials */}
      <div className="flex flex-wrap items-center gap-x-4 gap-y-1.5 border-t border-white/10 px-5 py-2.5 text-xs">
        <span className="flex items-center gap-1.5 text-white/30">
          <ShieldCheck size={13} /> Officials:
        </span>
        {officials.length === 0 ? (
          <span className="text-white/25">Not yet assigned</span>
        ) : (
          officials.map((o) => (
            <span key={o.label} className="text-white/60">
              <span className="text-white/30">{o.label}: </span>
              {o.value}
            </span>
          ))
        )}
      </div>

      <details className="border-t border-white/10 px-5 py-3">
        <summary className="cursor-pointer text-xs font-medium text-white/40 hover:text-white/70">Edit venue &amp; officials</summary>
        <form action={updateMatchHeaderInfo.bind(null, match.id)} className="mt-3 flex flex-col gap-2.5">
          <div className="grid grid-cols-1 gap-2 sm:grid-cols-2">
            <select
              name="venueId"
              aria-label="Stadium"
              defaultValue={match.venue_id ?? ""}
              className="h-9 rounded-lg border border-white/10 bg-white/5 px-3 text-sm text-white focus:border-white/30 focus:outline-none [&>option]:bg-surface-900 [&>option]:text-white"
            >
              <option value="">— No linked stadium record —</option>
              {venues.map((v) => (
                <option key={v.id} value={v.id}>
                  {v.name}
                  {v.city ? ` · ${v.city}` : ""}
                </option>
              ))}
            </select>
            <FieldInput name="venue" placeholder={`Free-text venue label (e.g. Teren ${match.home_team.name})`} defaultValue={match.venue ?? ""} />
          </div>
          <div className="grid grid-cols-1 gap-2 sm:grid-cols-2">
            <FieldInput name="refereeName" placeholder="Referee name" defaultValue={match.referee_name ?? ""} />
            <FieldInput name="varOfficialName" placeholder="VAR official" defaultValue={match.var_official_name ?? ""} />
            <FieldInput name="assistantReferee1Name" placeholder="Assistant referee 1" defaultValue={match.assistant_referee_1_name ?? ""} />
            <FieldInput name="assistantReferee2Name" placeholder="Assistant referee 2" defaultValue={match.assistant_referee_2_name ?? ""} />
            <FieldInput name="fourthOfficialName" placeholder="Fourth official" defaultValue={match.fourth_official_name ?? ""} />
          </div>
          <div className="grid grid-cols-1 gap-2 sm:grid-cols-[1fr_auto]">
            <FieldInput name="streamUrl" placeholder="Stream watch link (YouTube, Facebook, ...)" defaultValue={match.stream_url ?? ""} />
            <label className="flex h-9 items-center gap-2 rounded-lg border border-white/10 bg-white/5 px-3 text-xs text-white/70">
              <input type="checkbox" name="isFeaturedBroadcast" defaultChecked={match.is_featured_broadcast ?? false} className="accent-brand-400" />
              <Radio size={12} /> Featured broadcast
            </label>
          </div>
          <button type="submit" className="h-9 w-fit rounded-lg bg-white/10 px-3 text-xs font-semibold text-white hover:bg-white/20">
            Save
          </button>
        </form>
      </details>
    </div>
  );
}

function FieldInput({ name, placeholder, defaultValue }: { name: string; placeholder: string; defaultValue: string }) {
  return (
    <input
      name={name}
      aria-label={placeholder}
      defaultValue={defaultValue}
      placeholder={placeholder}
      className="h-9 rounded-lg border border-white/10 bg-white/5 px-3 text-sm text-white placeholder:text-white/30 focus:border-white/30 focus:outline-none"
    />
  );
}

function PlaceholderChip({ icon, label }: { icon: React.ReactNode; label: string }) {
  return (
    <span className="flex items-center gap-1.5 rounded-full bg-white/5 px-2.5 py-1 text-[11px] text-white/35">
      {icon} {label}: <span className="text-white/25">—</span>
    </span>
  );
}
