import Link from "next/link";
import { Radio, ArrowLeft, FileText } from "lucide-react";
import { getLiveMatch } from "@/lib/live-match";

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

const LIVE_STATUSES = new Set(["kickoff", "first_half", "second_half", "extra_time", "penalty_shootout"]);

export default async function LiveLayout({
  children,
  params,
}: {
  children: React.ReactNode;
  params: { matchId: string };
}) {
  const { match } = await getLiveMatch(params.matchId);
  const status = match.live_status ?? "pre_match";
  const isLive = LIVE_STATUSES.has(status);

  return (
    <div className="min-h-screen bg-[#05070a] text-white">
      <header className="sticky top-0 z-30 border-b border-white/10 bg-[#05070a]/95 backdrop-blur">
        <div className="mx-auto flex max-w-[1600px] items-center justify-between gap-4 px-4 py-3">
          <div className="flex items-center gap-3">
            <Link href="/live" className="flex items-center gap-1.5 text-xs text-white/40 hover:text-white">
              <ArrowLeft size={14} /> Live Center
            </Link>
            <span className="h-4 w-px bg-white/10" />
            <p className="font-display text-sm font-semibold">
              {match.home_team.name} <span className="text-white/30">vs</span> {match.away_team.name}
            </p>
          </div>

          <div className="flex items-center gap-3">
            <span
              className={`flex items-center gap-1.5 rounded-full px-3 py-1 text-[11px] font-bold uppercase tracking-wide ${
                isLive ? "bg-red-500/15 text-red-400" : "bg-white/10 text-white/50"
              }`}
            >
              <Radio size={11} className={isLive ? "animate-pulse" : ""} />
              {isLive && "LIVE · "}
              {STATUS_LABEL[status]}
            </span>
            <Link
              href={`/live/${params.matchId}/report`}
              className="flex items-center gap-1.5 rounded-lg bg-white/5 px-3 py-1.5 text-xs font-medium text-white/70 hover:bg-white/10 hover:text-white"
            >
              <FileText size={13} /> Report
            </Link>
          </div>
        </div>
      </header>

      <main className="mx-auto max-w-[1600px] px-4 py-4">{children}</main>
    </div>
  );
}
