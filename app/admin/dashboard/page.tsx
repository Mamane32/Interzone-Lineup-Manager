import Link from "next/link";
import { CalendarDays, CheckCircle2, ClipboardList, Plus, Radio } from "lucide-react";
import { supabaseAdmin } from "@/lib/supabase-admin";
import Card from "@/components/ui/Card";
import EmptyState from "@/components/ui/EmptyState";
import PageHeader from "@/components/ui/PageHeader";
import StatCard from "@/components/ui/StatCard";
import StatusBadge from "@/components/ui/StatusBadge";
import type { Lineup, Team } from "@/lib/types";
import { requireAdmin } from "@/lib/access";

export const dynamic = "force-dynamic";

async function getBoard() {
  const supabase = supabaseAdmin();
  const { data: matches } = await supabase
    .from("matches")
    .select("*, competition:competitions(*), home_team:teams!matches_home_team_id_fkey(*), away_team:teams!matches_away_team_id_fkey(*)")
    .order("match_date", { ascending: true })
    .order("match_time", { ascending: true });
  const { data: lineups } = await supabase.from("lineups").select("*");
  return { matches: matches ?? [], lineups: (lineups ?? []) as Lineup[] };
}

export default async function DashboardPage() {
  await requireAdmin();
  const { matches, lineups } = await getBoard();
  const submitted = lineups.filter((lineup) => Boolean(lineup.submitted_at)).length;
  const lineupFor = (matchId: string, teamId: string) =>
    lineups.find((lineup) => lineup.match_id === matchId && lineup.team_id === teamId);

  return (
    <div>
      <PageHeader
        eyebrow="Operations overview"
        title="Command center"
        description="Monitor the matchday picture and move quickly to the workflows that need attention."
        actions={
          <Link href="/admin/matches" className="inline-flex h-11 items-center gap-2 rounded-xl bg-brand-400 px-4 text-sm font-semibold text-surface-950 transition hover:bg-brand-100">
            <Plus size={16} /> Manage matches
          </Link>
        }
      />

      <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
        <StatCard label="Scheduled matches" value={matches.length} detail="Across active competitions" icon={CalendarDays} />
        <StatCard label="Lineup records" value={lineups.length} detail="Current matchday records" icon={ClipboardList} tone="neutral" />
        <StatCard label="Submitted lineups" value={submitted} detail="Ready for operational review" icon={CheckCircle2} tone="success" />
        <StatCard label="Live control" value="Ready" detail="Broadcast workspace available" icon={Radio} tone="brand" />
      </div>

      <section className="mt-8">
        <div className="mb-4 flex items-end justify-between">
          <div>
            <h2 className="font-display text-xl font-semibold">Match operations</h2>
            <p className="mt-1 text-xs text-white/35">Live submission status for every scheduled match.</p>
          </div>
          <Link href="/admin/matches" className="text-xs font-semibold text-brand-400 hover:text-brand-100">View all</Link>
        </div>

        {matches.length === 0 ? (
          <EmptyState
            compact
            icon={CalendarDays}
            title="No matches yet"
            description="Create a competition, add teams, then schedule a match to see submission status here."
            action={{ href: "/admin/matches", label: "Create a match" }}
          />
        ) : (
          <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-3">
            {matches.map((match: any) => {
              const homeLineup = lineupFor(match.id, match.home_team_id);
              const awayLineup = lineupFor(match.id, match.away_team_id);
              return (
                <Card key={match.id}>
                  <div className="mb-3 flex items-baseline justify-between gap-3">
                    <p className="font-display text-xs uppercase tracking-wide text-brand-400">
                      {match.competition?.name ?? "No competition"} {match.round ? `· ${match.round}` : ""}
                    </p>
                    <p className="whitespace-nowrap text-xs text-white/35">
                      {new Date(`${match.match_date}T${match.match_time}`).toLocaleString("fr-HT", {
                        day: "2-digit",
                        month: "short",
                        hour: "2-digit",
                        minute: "2-digit",
                      })}
                    </p>
                  </div>
                  <TeamRow team={match.home_team} lineup={homeLineup} />
                  <div className="my-2 border-t border-white/[0.06]" />
                  <TeamRow team={match.away_team} lineup={awayLineup} />
                </Card>
              );
            })}
          </div>
        )}
      </section>
    </div>
  );
}

function TeamRow({ team, lineup }: { team: Team; lineup?: Lineup }) {
  return (
    <Link href={lineup ? `/admin/lineups/${lineup.id}` : "/admin/matches"} className="flex items-center justify-between rounded-lg px-1 py-2 hover:bg-white/5">
      <span className="font-medium">{team?.name ?? "Unknown team"}</span>
      {lineup ? (
        <div className="flex items-center gap-3">
          <StatusBadge status={lineup.status} />
          {lineup.submitted_at && (
            <span className="text-xs text-white/35">
              {new Date(lineup.submitted_at).toLocaleTimeString("fr-HT", { hour: "2-digit", minute: "2-digit" })}
            </span>
          )}
        </div>
      ) : (
        <span className="text-xs text-white/35">—</span>
      )}
    </Link>
  );
}
