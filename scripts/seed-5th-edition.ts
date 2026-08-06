/**
 * One-off seed for the 5th Edition — Championnat Interzone Du Nord'Ouest,
 * Coupe Rock Clavaroche: organization, competition, season/division/stage,
 * the 3 official groups, the 15 real teams, and the 30 group-stage
 * fixtures (with the 6 results known as of 2026-08-05).
 *
 * Not run automatically — this repo's `supabase/migrations/*.sql` are
 * schema-only, and this is real tournament data entry, not a schema
 * change. Run it once, by hand, against an environment that has real
 * Supabase credentials:
 *
 *   SUPABASE_URL=... SUPABASE_SERVICE_ROLE_KEY=... npx tsx scripts/seed-5th-edition.ts
 *
 * Safe to re-run: every insert is preceded by a lookup, so running this
 * twice updates scores/details in place instead of creating duplicates.
 *
 * NOT included: quarterfinal/semifinal/final fixtures. matches.home_team_id
 * and away_team_id are NOT NULL — a knockout slot like "1e Gwoup A" isn't a
 * real team until that group's 10 matches are all finished, so those
 * fixtures can't be inserted yet. lib/bracket.ts resolves them from live
 * standings instead; once a group is complete, create the real
 * quarterfinal match from Admin -> Matches like any other match.
 *
 * Coach contact info for these 15 teams isn't known yet (only Jean Rabel
 * FC and Kriminal FC have real invited coaches so far, per the admin
 * Invitations list) — every team below gets an obviously-placeholder
 * coach_name/coach_phone/coach_email (the same "@interzone.local"
 * convention already used for this project's QA test accounts). Replace
 * these from Admin -> Teams once real coaches are confirmed; nothing here
 * touches invitations or user accounts.
 */
import { createClient } from "@supabase/supabase-js";
import { randomBytes } from "node:crypto";

const url = process.env.SUPABASE_URL;
const key = process.env.SUPABASE_SERVICE_ROLE_KEY;
if (!url || !key) {
  console.error("Missing SUPABASE_URL or SUPABASE_SERVICE_ROLE_KEY.");
  process.exit(1);
}
const supabase = createClient(url, key, { auth: { persistSession: false, autoRefreshToken: false } });

function teamToken(): string {
  const alphabet = "ABCDEFGHJKLMNPQRSTUVWXYZabcdefghijkmnopqrstuvwxyz23456789";
  let out = "";
  for (const b of randomBytes(8)) out += alphabet[b % alphabet.length];
  return out;
}

const ORG_NAME = "Ligue Football De Port-de-Paix";
const ORG_SLUG = "ligue-football-port-de-paix";
const COMPETITION_NAME = "Championnat Interzone Du Nord'Ouest — Coupe Rock Clavaroche";
const COMPETITION_SLUG = "interzone-nordouest-5e-edition";
const SEASON_NAME = "5è Edisyon 2026";
const DIVISION_NAME = "Championnat Interzone";
const STAGE_NAME = "Faz Gwoup";

type GroupLetter = "A" | "B" | "C";

const GROUPS: Record<GroupLetter, string[]> = {
  A: ["Kriminal FC", "FC Desmelus", "La Tortue FC", "FC Desroulins", "Legends FC"],
  B: ["Jean Rabel FC", "FC Dimanche Matin", "Inazuma SC", "Mikado FC", "La Pointe FC"],
  C: ["FC Real Cassave", "Beauchamp FC", "Billio FC", "Gladiators FC", "Resolution FC"],
};

type FixtureRow = {
  n: number;
  date: string; // YYYY-MM-DD
  home: string;
  away: string;
  group: GroupLetter;
  score?: [number, number]; // [home, away], omitted = not played yet
};

// Official calendar (24 Jiyè – 24 Out 2026) + known weekly results as of 2026-08-05.
// Match 5's score is recorded home/away as the calendar lists the fixture
// (La Pointe home, Inazuma away); the weekly results bulletin reported it
// the other way around ("Inazuma 2-1 La Pointe") — same result, order flipped here.
const FIXTURES: FixtureRow[] = [
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

// Placeholder — the calendar doesn't record kickoff times, only dates.
const DEFAULT_MATCH_TIME = "16:00:00";

async function upsertBySlugOrName<T extends Record<string, unknown>>(
  table: string,
  match: Record<string, unknown>,
  insert: T
): Promise<{ id: string }> {
  const { data: existing } = await supabase.from(table).select("id").match(match).maybeSingle();
  if (existing) return existing as { id: string };
  const { data, error } = await supabase.from(table).insert(insert).select("id").single();
  if (error) throw new Error(`insert into ${table} failed: ${error.message}`);
  return data as { id: string };
}

async function main() {
  console.log("Seeding 5th Edition — Interzone Nord'Ouest...");

  const org = await upsertBySlugOrName(
    "organizations",
    { slug: ORG_SLUG },
    { name: ORG_NAME, slug: ORG_SLUG, country: "Haiti", city: "Port-de-Paix" }
  );

  const competition = await upsertBySlugOrName(
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

  const season = await upsertBySlugOrName(
    "seasons",
    { competition_id: competition.id, name: SEASON_NAME },
    { competition_id: competition.id, name: SEASON_NAME, year: 2026, season_start: "2026-07-24", season_end: "2026-09-06" }
  );

  const division = await upsertBySlugOrName(
    "divisions",
    { season_id: season.id, name: DIVISION_NAME },
    { season_id: season.id, name: DIVISION_NAME, display_order: 0 }
  );

  const stage = await upsertBySlugOrName(
    "stages",
    { division_id: division.id, name: STAGE_NAME },
    { division_id: division.id, name: STAGE_NAME, stage_type: "group_stage", display_order: 0 }
  );

  const groupIdByLetter: Record<GroupLetter, string> = { A: "", B: "", C: "" };
  let order = 0;
  for (const letter of ["A", "B", "C"] as GroupLetter[]) {
    const group = await upsertBySlugOrName(
      "competition_groups",
      { stage_id: stage.id, name: `Groupe ${letter}` },
      { stage_id: stage.id, name: `Groupe ${letter}`, display_order: order++ }
    );
    groupIdByLetter[letter] = group.id;
  }
  console.log("Organization / competition / season / division / stage / groups ready.");

  const teamIdByName = new Map<string, string>();
  for (const letter of ["A", "B", "C"] as GroupLetter[]) {
    for (const name of GROUPS[letter]) {
      const slugPart = name.toLowerCase().replace(/[^a-z0-9]+/g, "-");
      const team = await upsertBySlugOrName(
        "teams",
        { competition_id: competition.id, name },
        {
          competition_id: competition.id,
          name,
          coach_name: "Kòch a konfime",
          coach_phone: "000-0000",
          coach_email: `coach-tbd+${slugPart}@interzone.local`,
          token: teamToken(),
        }
      );
      teamIdByName.set(name, team.id);
    }
  }
  console.log(`${teamIdByName.size} teams ready.`);

  let created = 0;
  let updated = 0;
  for (const fx of FIXTURES) {
    const home_team_id = teamIdByName.get(fx.home);
    const away_team_id = teamIdByName.get(fx.away);
    if (!home_team_id || !away_team_id) throw new Error(`Unknown team in fixture ${fx.n}: ${fx.home} vs ${fx.away}`);

    const group_id = groupIdByLetter[fx.group];
    const live_status = fx.score ? "full_time" : "pre_match";
    const home_score = fx.score?.[0] ?? 0;
    const away_score = fx.score?.[1] ?? 0;

    const { data: existing } = await supabase
      .from("matches")
      .select("id")
      .match({ home_team_id, away_team_id, match_date: fx.date })
      .maybeSingle();

    if (existing) {
      const { error } = await supabase
        .from("matches")
        .update({ live_status, home_score, away_score, group_id, round: `Match ${fx.n}` })
        .eq("id", existing.id);
      if (error) throw new Error(`update match ${fx.n} failed: ${error.message}`);
      updated++;
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
      created++;
    }
  }

  console.log(`Matches: ${created} created, ${updated} updated (${FIXTURES.length} total).`);
  console.log("Done. Quarterfinal/semifinal/final fixtures are not seeded — see this file's header comment.");
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
