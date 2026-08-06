import Link from "next/link";
import { Radio, Trophy } from "lucide-react";
import { supabaseAdmin } from "@/lib/supabase-admin";
import { formatMatchDate } from "@/lib/utils";
import { getBaseBranding } from "@/lib/branding";
import { requireRole } from "@/lib/access";
import BrandBar from "@/components/live/BrandBar";
import BrandMark from "@/components/brand/BrandMark";
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

export default async function BroadcastControlCenterIndexPage() {
  const { role } = await requireRole(["broadcast_operator", "admin", "super_admin"]);
  const homeHref = role === "admin" || role === "super_admin" ? "/admin/dashboard" : "/live";
  const supabase = supabaseAdmin();
  const { data: matches } = await supabase
    .from("matches")
    .select(
      "*, competition:competitions(name), home_team:teams!matches_home_team_id_fkey(*), away_team:teams!matches_away_team_id_fkey(*)"
    )
    .order("match_date", { ascending: false })
    .order("match_time", { ascending: false });

  const list = matches ?? [];
  const branding = getBaseBranding();

  return (
    <div className="min-h-screen bg-surface-950 px-4 py-10 text-white">
      <div className="mx-auto max-w-3xl">
        <div className="mb-8 flex items-center justify-between gap-3">
          <BrandMark compact size="sm" href={homeHref} />
          <div className="flex items-center gap-2">
            <Radio size={18} className="text-red-400" />
            <div>
              <p className="text-[10px] uppercase tracking-[0.2em] text-white/35">Broadcast Control Center</p>
              <BrandBar branding={branding} />
            </div>
          </div>
        </div>

        {list.length === 0 && (
          <p className="text-white/40">No matches yet — create one from the Admin Matches page.</p>
        )}

        <div className="flex flex-col gap-2">
          {list.map((m: MatchListRow) => (
            <Link
              key={m.id}
              href={`/live/${m.id}`}
              className="flex items-center justify-between gap-3 surface-panel p-4 transition-colors hover:border-white/25 hover:bg-white/[0.06]"
            >
              <div>
                <p className="flex items-center gap-1.5 text-[11px] uppercase tracking-wide text-white/40">
                  <Trophy size={11} /> {m.competition?.name ?? "No competition"}
                </p>
                <p className="mt-1 font-display font-semibold">
                  {m.home_team?.name} <span className="text-white/30">vs</span> {m.away_team?.name}
                </p>
                <p className="mt-0.5 text-xs text-white/40">{formatMatchDate(m.match_date, m.match_time)}</p>
              </div>
              <span className="flex-none rounded-full bg-white/10 px-3 py-1 text-[11px] font-semibold uppercase tracking-wide text-white/60">
                {STATUS_LABEL[m.live_status ?? "pre_match"]}
              </span>
            </Link>
          ))}
        </div>
      </div>
    </div>
  );
}
