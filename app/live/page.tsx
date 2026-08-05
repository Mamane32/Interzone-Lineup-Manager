import Image from "next/image";
import Link from "next/link";
import { CalendarClock, LayoutDashboard, Radio, Shield, Trophy } from "lucide-react";
import { supabaseAdmin } from "@/lib/supabase-admin";
import { formatMatchDate, formatKickoffCountdown } from "@/lib/utils";
import { getBaseBrandingAsync } from "@/lib/branding";
import { requireRole } from "@/lib/access";
import BrandBar from "@/components/live/BrandBar";
import type { Match, Team } from "@/lib/types";

export const dynamic = "force-dynamic";

type MatchListRow = Match & {
  competition: { name: string } | null;
  home_team: Team;
  away_team: Team;
};

const STATUS_LABEL: Record<string, string> = {
  pre_match: "Scheduled",
  kickoff: "Kick Off",
  first_half: "First Half",
  half_time: "Half-time",
  second_half: "Second Half",
  extra_time: "Additional Time",
  penalty_shootout: "Penalties",
  full_time: "Full-time",
};

const LIVE_STATUSES = new Set(["kickoff", "first_half", "half_time", "second_half", "extra_time", "penalty_shootout"]);

export default async function BroadcastControlCenterIndexPage() {
  const { role } = await requireRole(["broadcast_operator", "admin", "super_admin"]);
  const showAdminLink = role === "admin" || role === "super_admin";
  const supabase = supabaseAdmin();
  const [{ data: matches }, branding] = await Promise.all([
    supabase
      .from("matches")
      .select(
        "*, competition:competitions(name), home_team:teams!matches_home_team_id_fkey(*), away_team:teams!matches_away_team_id_fkey(*)"
      )
      .order("match_date", { ascending: false })
      .order("match_time", { ascending: false }),
    getBaseBrandingAsync(),
  ]);

  const list = (matches ?? []) as MatchListRow[];

  return (
    <div className="min-h-screen bg-surface-950 px-4 py-10 text-white">
      <div className="mx-auto max-w-3xl">
        <div className="mb-8 flex items-center justify-between gap-3">
          <div className="flex items-center gap-2">
            <Radio size={18} className="text-red-400" />
            <div>
              <p className="text-[10px] uppercase tracking-[0.2em] text-white/35">Broadcast Control Center</p>
              <BrandBar branding={branding} />
            </div>
          </div>
          {showAdminLink && (
            <Link
              href="/admin/dashboard"
              className="flex flex-none items-center gap-1.5 rounded-full bg-white/5 px-3 py-1.5 text-xs font-semibold text-white/50 transition hover:bg-white/10 hover:text-white"
              title="Back to Admin Overview"
            >
              <LayoutDashboard size={13} /> <span className="hidden sm:inline">Admin Overview</span>
            </Link>
          )}
        </div>

        {list.length === 0 && (
          <p className="text-white/40">No matches yet — create one from the Admin Matches page.</p>
        )}

        <div className="flex flex-col gap-3">
          {list.map((m) => (
            <MatchCard key={m.id} match={m} />
          ))}
        </div>
      </div>
    </div>
  );
}

function MatchCard({ match: m }: { match: MatchListRow }) {
  const status = m.live_status ?? "pre_match";
  const isScheduled = status === "pre_match";
  const isLive = LIVE_STATUSES.has(status);
  const isFinal = status === "full_time";
  const countdown = isScheduled ? formatKickoffCountdown(m.match_date, m.match_time) : null;

  return (
    <Link
      href={`/live/${m.id}`}
      className={`group relative flex flex-col gap-4 overflow-hidden rounded-2xl border bg-white/[0.02] p-5 shadow-[0_1px_0_rgba(255,255,255,0.04)_inset,0_18px_36px_-24px_rgba(0,0,0,0.65)] transition-all duration-200 hover:-translate-y-0.5 hover:border-white/20 hover:bg-white/[0.045] hover:shadow-[0_1px_0_rgba(255,255,255,0.06)_inset,0_24px_48px_-20px_rgba(0,0,0,0.75)] ${
        isLive ? "border-red-500/30" : "border-white/[0.08]"
      }`}
    >
      {/* Header row — competition, round, status */}
      <div className="flex flex-wrap items-center justify-between gap-2">
        <p className="flex items-center gap-1.5 text-[11px] font-semibold uppercase tracking-wide text-white/40">
          <Trophy size={12} className="text-brand-400/70" />
          {m.competition?.name ?? "No competition"}
          {m.round && <span className="text-white/25">· {m.round}</span>}
        </p>
        <span
          className={`flex flex-none items-center gap-1.5 rounded-full px-3 py-1 text-[10px] font-bold uppercase tracking-wide ${
            isLive
              ? "bg-red-500/15 text-red-400"
              : isFinal
                ? "bg-white/[0.06] text-white/45"
                : "bg-brand-400/15 text-brand-300"
          }`}
        >
          {isLive && (
            <span className="relative flex h-1.5 w-1.5">
              <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-red-500 opacity-75" />
              <span className="relative inline-flex h-1.5 w-1.5 rounded-full bg-red-500" />
            </span>
          )}
          {isLive && "LIVE · "}
          {STATUS_LABEL[status] ?? status}
        </span>
      </div>

      {/* Matchup — logos, names, score/vs, balanced three-column layout */}
      <div className="grid grid-cols-[1fr_auto_1fr] items-center gap-3">
        <TeamBlock team={m.home_team} align="right" />

        <div className="flex flex-col items-center gap-1 px-2">
          {isScheduled ? (
            <span className="font-display text-xl font-semibold text-white/25">vs</span>
          ) : (
            <span className="flex items-center gap-2.5 font-display text-2xl font-bold tabular-nums text-white">
              <span>{m.home_score ?? 0}</span>
              <span className="text-white/20">–</span>
              <span>{m.away_score ?? 0}</span>
            </span>
          )}
        </div>

        <TeamBlock team={m.away_team} align="left" />
      </div>

      {/* Footer — date/time and, for scheduled matches, a live countdown */}
      <div className="flex flex-wrap items-center justify-between gap-2 border-t border-white/[0.06] pt-3 text-xs text-white/40">
        <span>{formatMatchDate(m.match_date, m.match_time)}</span>
        {countdown && (
          <span className="flex items-center gap-1.5 font-semibold text-brand-300">
            <CalendarClock size={12} /> {countdown}
          </span>
        )}
      </div>
    </Link>
  );
}

function TeamBlock({ team, align }: { team: Team; align: "left" | "right" }) {
  const isRight = align === "right";
  return (
    <div className={`flex min-w-0 items-center gap-2.5 ${isRight ? "flex-row-reverse text-right" : "text-left"}`}>
      {team?.logo_url ? (
        <Image
          src={team.logo_url}
          alt=""
          width={36}
          height={36}
          className="h-9 w-9 flex-none rounded-full object-cover ring-1 ring-white/10"
          unoptimized
        />
      ) : (
        <span className="flex h-9 w-9 flex-none items-center justify-center rounded-full bg-white/5 text-white/25 ring-1 ring-white/10">
          <Shield size={16} />
        </span>
      )}
      <span className="min-w-0 truncate font-display text-sm font-semibold text-white/90">{team?.name}</span>
    </div>
  );
}
