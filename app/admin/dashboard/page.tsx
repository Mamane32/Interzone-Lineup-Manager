import Link from "next/link";
import { supabaseAdmin } from "@/lib/supabase-admin";
import Card from "@/components/ui/Card";
import StatusBadge from "@/components/ui/StatusBadge";
import type { Lineup, Match, Team, Competition } from "@/lib/types";
import { requireAdmin } from "@/lib/access";

// Always render on request — this page reads live data via the service-role
// Supabase client, and must never be executed or cached at build time.
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

  const lineupFor = (matchId: string, teamId: string) =>
    lineups.find((l) => l.match_id === matchId && l.team_id === teamId);

  if (matches.length === 0) {
    return (
      <EmptyState
        title="No matches yet"
        body="Create a competition, add teams, then schedule a match to see submission status here."
        href="/admin/matches"
        cta="Create a match"
      />
    );
  }

  return (
    <div className="flex flex-col gap-6">
      <div>
        <h1 className="font-display text-3xl font-semibold">Dashboard</h1>
        <p className="text-ink-muted">Live submission status for every match.</p>
      </div>

      <div className="grid gap-4 sm:grid-cols-2">
        {matches.map((m: any) => {
          const homeLineup = lineupFor(m.id, m.home_team_id);
          const awayLineup = lineupFor(m.id, m.away_team_id);
          return (
            <Card key={m.id}>
              <div className="mb-3 flex items-baseline justify-between">
                <p className="font-display text-xs uppercase tracking-wide text-amber-signal">
                  {m.competition?.name ?? "No competition"} {m.round ? `· ${m.round}` : ""}
                </p>
                <p className="text-xs text-ink-muted">
                  {new Date(`${m.match_date}T${m.match_time}`).toLocaleString("fr-HT", {
                    day: "2-digit",
                    month: "short",
                    hour: "2-digit",
                    minute: "2-digit",
                  })}
                </p>
              </div>

              <TeamRow team={m.home_team} lineup={homeLineup} />
              <div className="my-2 border-t border-ink-line" />
              <TeamRow team={m.away_team} lineup={awayLineup} />
            </Card>
          );
        })}
      </div>
    </div>
  );
}

function TeamRow({ team, lineup }: { team: Team; lineup?: Lineup }) {
  return (
    <Link
      href={lineup ? `/admin/lineups/${lineup.id}` : "#"}
      className="flex items-center justify-between rounded-lg px-1 py-2 hover:bg-white/5"
    >
      <span className="font-medium">{team?.name ?? "Unknown team"}</span>
      {lineup ? (
        <div className="flex items-center gap-3">
          <StatusBadge status={lineup.status} />
          {lineup.submitted_at && (
            <span className="text-xs text-ink-muted">
              {new Date(lineup.submitted_at).toLocaleTimeString("fr-HT", {
                hour: "2-digit",
                minute: "2-digit",
              })}
            </span>
          )}
        </div>
      ) : (
        <span className="text-xs text-ink-muted">—</span>
      )}
    </Link>
  );
}

function EmptyState({
  title,
  body,
  href,
  cta,
}: {
  title: string;
  body: string;
  href: string;
  cta: string;
}) {
  return (
    <div className="flex min-h-[50vh] flex-col items-center justify-center text-center">
      <h1 className="font-display text-2xl font-semibold">{title}</h1>
      <p className="mt-2 max-w-sm text-ink-muted">{body}</p>
      <Link
        href={href}
        className="mt-6 rounded-xl bg-amber-signal px-5 py-3 font-semibold text-ink"
      >
        {cta}
      </Link>
    </div>
  );
}
