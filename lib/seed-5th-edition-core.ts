import type { SupabaseClient } from "@supabase/supabase-js";

/**
 * The actual 5th Edition seed data + algorithm, framework-agnostic on
 * purpose: no "server-only" import here, so both the in-app admin action
 * (lib/seed-5th-edition.ts, uses supabaseAdmin()) and the standalone
 * script (scripts/seed-5th-edition.ts, uses its own createClient()) run
 * the exact same logic instead of maintaining two copies. See either
 * caller for how/when to run this — this file is just the shared core.
 */

export const ORG_NAME = "Ligue Football De Port-de-Paix";
export const ORG_SLUG = "ligue-football-port-de-paix";
export const COMPETITION_NAME = "Championnat Interzone Du Nord'Ouest — Coupe Rock Clavaroche";
export const COMPETITION_SLUG = "interzone-nordouest-5e-edition";
export const SEASON_NAME = "5è Edisyon 2026";
export const DIVISION_NAME = "Championnat Interzone";
export const STAGE_NAME = "Faz Gwoup";
const DEFAULT_MATCH_TIME = "16:00:00";

type GroupLetter = "A" | "B" | "C";

export const GROUPS: Record<GroupLetter, string[]> = {
  A: ["Kriminal FC", "FC Desmelus", "La Tortue FC", "FC Desroulins", "Legends FC"],
  B: ["Jean Rabel FC", "FC Dimanche Matin", "Inazuma SC", "Mikado FC", "La Pointe FC"],
  C: ["FC Real Cassave", "Beauchamp FC", "Billio FC", "Gladiators FC", "Resolution FC"],
};

type FixtureRow = {
  n: number;
  date: string;
  home: string;
  away: string;
  group: GroupLetter;
  score?: [number, number];
};

// Official calendar (24 Jiyè – 24 Out 2026) + known weekly results as of
// 2026-08-05. Match 5's score is recorded home/away as the calendar lists
// the fixture (La Pointe home, Inazuma away); the weekly results bulletin
// reported it the other way around ("Inazuma 2-1 La Pointe") — same
// result, order flipped here.
export const FIXTURES: FixtureRow[] = [
  { n: 1, date: "2026-07-24", home: "Kriminal FC", away: "FC Desmelus", group: "A" },
  { n: 2, date: "2026-07-25", home: "Jean Rabel FC", away: "FC Dimanche Matin", group: "B" },
  { n: 3, date: "2026-07-26", home: "Beauchamp FC", away: "FC Real Cassave", group: "C" },
  { n: 4, date: "2026-07-27", home: "FC Desroulins", away: "Legends FC", group: "A", score: [0, 0] },
  { n: 5, date: "2026-07-28", home: "La Pointe FC", away: "Inazuma SC", group: "B", score: [1, 2] },
  { n: 6, date: "2026-07-29", home: "Gladiators FC", away: "Resolution FC", group: "C", score: [0, 0] },
  { n: 7, date: "2026-07-30", home: "FC Desmelus", away: "La Tortue FC", group: "A", score: [2, 1] },
  { n: 8, date: "2026-07-31", home: "FC Dimanche Matin", away: "Mikado FC", group: "B", score: [7, 1] },
  { n: 9, date: "2026-08-01", home: "FC Real Cassave", away: "Billio FC", group: "C", score: [3, 0] },
  { n: 10, date: "2026-08-02", home: "Kriminal FC", away: "Legends FC", group: "A" },
  { n: 11, date: "2026-08-03", home: "Jean Rabel FC", away: "Inazuma SC", group: "B" },
  { n: 12, date: "2026-08-04", home: "Beauchamp FC", away: "Gladiators FC", group: "C" },
  { n: 13, date: "2026-08-05", home: "FC Desroulins", away: "La Tortue FC", group: "A" },
  { n: 14, date: "2026-08-06", home: "La Pointe FC", away: "Mikado FC", group: "B" },
  { n: 15, date: "2026-08-07", home: "Billio FC", away: "Resolution FC", group: "C" },
  { n: 16, date: "2026-08-08", home: "FC Desmelus", away: "Legends FC", group: "A" },
  { n: 17, date: "2026-08-09", home: "FC Dimanche Matin", away: "Inazuma SC", group: "B" },
  { n: 18, date: "2026-08-10", home: "FC Real Cassave", away: "Gladiators FC", group: "C" },
  { n: 19, date: "2026-08-11", home: "Kriminal FC", away: "FC Desroulins", group: "A" },
  { n: 20, date: "2026-08-12", home: "Jean Rabel FC", away: "Mikado FC", group: "B" },
  { n: 21, date: "2026-08-13", home: "Beauchamp FC", away: "Billio FC", group: "C" },
  { n: 22, date: "2026-08-15", home: "La Tortue FC", away: "Legends FC", group: "A" },
  { n: 23, date: "2026-08-16", home: "Jean Rabel FC", away: "La Pointe FC", group: "B" },
  { n: 24, date: "2026-08-17", home: "Resolution FC", away: "FC Real Cassave", group: "C" },
  { n: 25, date: "2026-08-18", home: "FC Desmelus", away: "FC Desroulins", group: "A" },
  { n: 26, date: "2026-08-19", home: "Billio FC", away: "Gladiators FC", group: "C" },
  { n: 27, date: "2026-08-20", home: "Kriminal FC", away: "La Tortue FC", group: "A" },
  { n: 28, date: "2026-08-21", home: "Mikado FC", away: "Inazuma SC", group: "B" },
  { n: 29, date: "2026-08-23", home: "FC Dimanche Matin", away: "La Pointe FC", group: "B" },
  { n: 30, date: "2026-08-24", home: "Beauchamp FC", away: "Resolution FC", group: "C" },
];

export type SeedResult = { teams: number; matchesCreated: number; matchesUpdated: number };

export async function runFifthEditionSeed(supabase: SupabaseClient, generateToken: () => string): Promise<SeedResult> {
  async function upsert<T extends Record<string, unknown>>(table: string, match: Record<string, unknown>, insert: T): Promise<{ id: string }> {
    const { data: existing } = await supabase.from(table).select("id").match(match).maybeSingle();
    if (existing) return existing as { id: string };
    const { data, error } = await supabase.from(table).insert(insert).select("id").single();
    if (error) throw new Error(`insert into ${table} failed: ${error.message}`);
    return data as { id: string };
  }

  const org = await upsert("organizations", { slug: ORG_SLUG }, { name: ORG_NAME, slug: ORG_SLUG, country: "Haiti", city: "Port-de-Paix" });

  const competition = await upsert(
    "competitions",
    { organization_id: org.id, slug: COMPETITION_SLUG },
    {
      organization_id: org.id,
      name: COMPETITION_NAME,
      short_name: "Interzone 5è Edisyon",
      slug: COMPETITION_SLUG,
      sport: "football",
      competition_type: "group_knockout",
      points_win: 3,
      points_draw: 1,
      points_loss: 0,
    }
  );

  const season = await upsert(
    "seasons",
    { competition_id: competition.id, name: SEASON_NAME },
    { competition_id: competition.id, name: SEASON_NAME, year: 2026, season_start: "2026-07-24", season_end: "2026-09-06" }
  );

  const division = await upsert("divisions", { season_id: season.id, name: DIVISION_NAME }, { season_id: season.id, name: DIVISION_NAME, display_order: 0 });

  const stage = await upsert(
    "stages",
    { division_id: division.id, name: STAGE_NAME },
    { division_id: division.id, name: STAGE_NAME, stage_type: "group_stage", display_order: 0 }
  );

  const groupIdByLetter: Record<GroupLetter, string> = { A: "", B: "", C: "" };
  let order = 0;
  for (const letter of ["A", "B", "C"] as GroupLetter[]) {
    const group = await upsert("competition_groups", { stage_id: stage.id, name: `Groupe ${letter}` }, { stage_id: stage.id, name: `Groupe ${letter}`, display_order: order++ });
    groupIdByLetter[letter] = group.id;
  }

  const teamIdByName = new Map<string, string>();
  for (const letter of ["A", "B", "C"] as GroupLetter[]) {
    for (const name of GROUPS[letter]) {
      const slugPart = name.toLowerCase().replace(/[^a-z0-9]+/g, "-");
      const team = await upsert(
        "teams",
        { competition_id: competition.id, name },
        {
          competition_id: competition.id,
          name,
          coach_name: "Kòch a konfime",
          coach_phone: "000-0000",
          coach_email: `coach-tbd+${slugPart}@interzone.local`,
          token: generateToken(),
        }
      );
      teamIdByName.set(name, team.id);
    }
  }

  let matchesCreated = 0;
  let matchesUpdated = 0;
  for (const fx of FIXTURES) {
    const home_team_id = teamIdByName.get(fx.home);
    const away_team_id = teamIdByName.get(fx.away);
    if (!home_team_id || !away_team_id) throw new Error(`Unknown team in fixture ${fx.n}: ${fx.home} vs ${fx.away}`);

    const group_id = groupIdByLetter[fx.group];
    const live_status = fx.score ? "full_time" : "pre_match";
    const home_score = fx.score?.[0] ?? 0;
    const away_score = fx.score?.[1] ?? 0;

    const { data: existing } = await supabase.from("matches").select("id").match({ home_team_id, away_team_id, match_date: fx.date }).maybeSingle();

    if (existing) {
      const { error } = await supabase.from("matches").update({ live_status, home_score, away_score, group_id, round: `Match ${fx.n}` }).eq("id", existing.id);
      if (error) throw new Error(`update match ${fx.n} failed: ${error.message}`);
      matchesUpdated++;
    } else {
      const { error } = await supabase.from("matches").insert({
        home_team_id,
        away_team_id,
        match_date: fx.date,
        match_time: DEFAULT_MATCH_TIME,
        group_id,
        round: `Match ${fx.n}`,
        live_status,
        home_score,
        away_score,
      });
      if (error) throw new Error(`insert match ${fx.n} failed: ${error.message}`);
      matchesCreated++;
    }
  }

  return { teams: teamIdByName.size, matchesCreated, matchesUpdated };
}
