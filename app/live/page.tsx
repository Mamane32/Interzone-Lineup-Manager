import Link from "next/link";
import { Radio, Trophy } from "lucide-react";
import { supabaseAdmin } from "@/lib/supabase-admin";
import { formatMatchDate } from "@/lib/utils";

export const dynamic = "force-dynamic";

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

export default async function LiveIndexPage() {
  const supabase = supabaseAdmin();
  const { data: matches } = await supabase
    .from("matches")
    .select(
      "*, competition:competitions(name), home_team:teams!matches_home_team_id_fkey(*), away_team:teams!matches_away_team_id_fkey(*)"
    )
    .order("match_date", { ascending: false })
    .order("match_time", { ascending: false });

  const list = matches ?? [];

  return (
    <div className="min-h-screen bg-[#05070a] px-4 py-10 text-white">
      <div className="mx-auto max-w-3xl">
        <div className="mb-8 flex items-center gap-2">
          <Radio size={18} className="text-red-400" />
          <h1 className="font-display text-2xl font-semibold">Broadcast Control Center</h1>
        </div>

        {list.length === 0 && (
          <p className="text-white/40">No matches yet — create one from the Admin Matches page.</p>
        )}

        <div className="flex flex-col gap-2">
          {list.map((m: any) => (
            <Link
              key={m.id}
              href={`/live/${m.id}`}
              className="flex items-center justify-between gap-3 rounded-2xl border border-white/10 bg-white/[0.03] p-4 transition-colors hover:border-white/25 hover:bg-white/[0.06]"
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
