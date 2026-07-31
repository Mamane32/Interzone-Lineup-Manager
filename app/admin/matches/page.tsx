import Link from "next/link";
import { supabaseAdmin } from "@/lib/supabase-admin";
import { createMatch, deleteMatch } from "./actions";
import Card from "@/components/ui/Card";
import Input from "@/components/ui/Input";
import Select from "@/components/ui/Select";
import Button from "@/components/ui/Button";
import MatchHierarchyFields from "@/components/foundation/MatchHierarchyFields";
import { formatMatchDate } from "@/lib/utils";
import type { Team, Competition, Season, Division, Stage, CompetitionGroup, Venue } from "@/lib/types";
import { requireAdmin } from "@/lib/access";

// Always render on request — this page reads live data via the service-role
// Supabase client, and must never be executed or cached at build time.
export const dynamic = "force-dynamic";

const ERROR_MESSAGES: Record<string, string> = {
  "save-failed": "Could not save the match — check that the competition structure you picked actually nests correctly.",
};

export default async function MatchesPage({ searchParams }: { searchParams: { error?: string } }) {
  await requireAdmin();
  const supabase = supabaseAdmin();

  const [{ data: teams }, { data: competitions }, { data: seasons }, { data: divisions }, { data: stages }, { data: groups }, { data: venues }, { data: matches }] =
    await Promise.all([
      supabase.from("teams").select("*").order("name"),
      supabase.from("competitions").select("*").order("name"),
      supabase.from("seasons").select("*").order("name"),
      supabase.from("divisions").select("*").order("display_order"),
      supabase.from("stages").select("*").order("display_order"),
      supabase.from("competition_groups").select("*").order("display_order"),
      supabase.from("venues").select("*").order("name"),
      supabase
        .from("matches")
        .select(
          "*, competition:competitions(*), home_team:teams!matches_home_team_id_fkey(*), away_team:teams!matches_away_team_id_fkey(*), season:seasons(name), division:divisions(name), stage:stages(name), group:competition_groups(name), venue_ref:venues(name, city)"
        )
        .order("match_date", { ascending: false }),
    ]);

  const teamList = (teams ?? []) as Team[];
  const competitionList = (competitions ?? []) as Competition[];
  const seasonList = (seasons ?? []) as Season[];
  const divisionList = (divisions ?? []) as Division[];
  const stageList = (stages ?? []) as Stage[];
  const groupList = (groups ?? []) as CompetitionGroup[];
  const venueList = (venues ?? []) as Venue[];
  const matchList = matches ?? [];

  if (teamList.length < 2) {
    return (
      <div className="flex flex-col gap-6">
        <h1 className="font-display text-3xl font-semibold">Matches</h1>
        <p className="text-white/40">Add at least two teams before scheduling a match.</p>
      </div>
    );
  }

  return (
    <div className="flex flex-col gap-6">
      <div>
        <h1 className="font-display text-3xl font-semibold">Matches</h1>
        <p className="text-white/40">Both coaches get their private lineup page automatically.</p>
      </div>

      {searchParams.error && (
        <p className="rounded-lg bg-status-correction/10 px-3 py-2 text-sm font-medium text-status-correction">
          {ERROR_MESSAGES[searchParams.error] ?? "Something went wrong."}
        </p>
      )}

      <Card className="max-w-3xl">
        <h2 className="mb-4 font-display text-lg font-semibold">Create match</h2>
        <form action={createMatch} className="grid gap-4 sm:grid-cols-2">
          <Input id="round" name="round" label="Round (optional)" placeholder="e.g. Quarterfinal" />
          <span className="hidden sm:block" />
          <Select id="home_team_id" name="home_team_id" label="Home team" tone="dark" required>
            <option value="">Select team</option>
            {teamList.map((t) => (
              <option key={t.id} value={t.id}>
                {t.name}
              </option>
            ))}
          </Select>
          <Select id="away_team_id" name="away_team_id" label="Away team" tone="dark" required>
            <option value="">Select team</option>
            {teamList.map((t) => (
              <option key={t.id} value={t.id}>
                {t.name}
              </option>
            ))}
          </Select>
          <Input id="match_date" name="match_date" type="date" label="Date" required />
          <Input id="match_time" name="match_time" type="time" label="Time" required />

          <MatchHierarchyFields
            competitions={competitionList}
            seasons={seasonList}
            divisions={divisionList}
            stages={stageList}
            groups={groupList}
            venues={venueList}
          />

          <Button type="submit" className="sm:col-span-2 mt-2">
            Create match
          </Button>
        </form>
      </Card>

      <div className="flex flex-col gap-3">
        {matchList.length === 0 && <p className="text-white/40">No matches yet.</p>}
        {matchList.map((m: any) => {
          const structure = [m.season?.name, m.division?.name, m.stage?.name, m.group?.name].filter(Boolean).join(" › ");
          return (
          <Card key={m.id} className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
            <div>
              <p className="text-xs uppercase tracking-wide text-brand-400">
                {m.competition?.name ?? "No competition"} {m.round ? `· ${m.round}` : ""}
              </p>
              <p className="font-semibold">
                {m.home_team?.name} <span className="text-white/40">vs</span> {m.away_team?.name}
              </p>
              <p className="text-xs text-white/40">{formatMatchDate(m.match_date, m.match_time)}</p>
              {structure && <p className="text-xs text-white/30">{structure}</p>}
              {m.venue_ref?.name && (
                <p className="text-xs text-white/30">
                  {m.venue_ref.name}
                  {m.venue_ref.city ? `, ${m.venue_ref.city}` : ""}
                </p>
              )}
            </div>
            <div className="flex gap-2">
              <Link href={`/live/${m.id}`}>
                <Button type="button" variant="secondary" size="md">
                  Broadcast Control Center
                </Button>
              </Link>
              <form action={deleteMatch.bind(null, m.id)}>
                <Button type="submit" variant="danger" size="md">
                  Delete
                </Button>
              </form>
            </div>
          </Card>
          );
        })}
      </div>
    </div>
  );
}
