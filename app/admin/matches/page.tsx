import Link from "next/link";
import { supabaseAdmin } from "@/lib/supabase-admin";
import { createMatch, deleteMatch } from "./actions";
import Card from "@/components/ui/Card";
import Input from "@/components/ui/Input";
import Select from "@/components/ui/Select";
import Button from "@/components/ui/Button";
import { formatMatchDate } from "@/lib/utils";
import type { Team, Competition } from "@/lib/types";

// Always render on request — this page reads live data via the service-role
// Supabase client, and must never be executed or cached at build time.
export const dynamic = "force-dynamic";


export default async function MatchesPage() {
  const supabase = supabaseAdmin();

  const [{ data: teams }, { data: competitions }, { data: matches }] = await Promise.all([
    supabase.from("teams").select("*").order("name"),
    supabase.from("competitions").select("*").order("name"),
    supabase
      .from("matches")
      .select("*, competition:competitions(*), home_team:teams!matches_home_team_id_fkey(*), away_team:teams!matches_away_team_id_fkey(*)")
      .order("match_date", { ascending: false }),
  ]);

  const teamList = (teams ?? []) as Team[];
  const competitionList = (competitions ?? []) as Competition[];
  const matchList = matches ?? [];

  if (teamList.length < 2) {
    return (
      <div className="flex flex-col gap-6">
        <h1 className="font-display text-3xl font-semibold">Matches</h1>
        <p className="text-ink-muted">Add at least two teams before scheduling a match.</p>
      </div>
    );
  }

  return (
    <div className="flex flex-col gap-6">
      <div>
        <h1 className="font-display text-3xl font-semibold">Matches</h1>
        <p className="text-ink-muted">Both coaches get their private lineup page automatically.</p>
      </div>

      <Card className="max-w-2xl">
        <h2 className="mb-4 font-display text-lg font-semibold">Create match</h2>
        <form action={createMatch} className="grid gap-4 sm:grid-cols-2">
          <Select id="competition_id" name="competition_id" label="Competition" tone="dark">
            <option value="">— None —</option>
            {competitionList.map((c) => (
              <option key={c.id} value={c.id}>
                {c.name}
              </option>
            ))}
          </Select>
          <Input id="round" name="round" label="Round (optional)" placeholder="e.g. Quarterfinal" />
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
          <Button type="submit" className="sm:col-span-2 mt-2">
            Create match
          </Button>
        </form>
      </Card>

      <div className="flex flex-col gap-3">
        {matchList.length === 0 && <p className="text-ink-muted">No matches yet.</p>}
        {matchList.map((m: any) => (
          <Card key={m.id} className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
            <div>
              <p className="text-xs uppercase tracking-wide text-amber-signal">
                {m.competition?.name ?? "No competition"} {m.round ? `· ${m.round}` : ""}
              </p>
              <p className="font-semibold">
                {m.home_team?.name} <span className="text-ink-muted">vs</span> {m.away_team?.name}
              </p>
              <p className="text-xs text-ink-muted">{formatMatchDate(m.match_date, m.match_time)}</p>
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
        ))}
      </div>
    </div>
  );
}
