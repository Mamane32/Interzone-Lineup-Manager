/**
 * Standalone fallback for lib/seed-5th-edition-core.ts's seed — same data,
 * same algorithm, run outside the app for whoever has real Supabase
 * credentials on hand but doesn't want to sign into the deployed site as
 * super_admin. Prefer Admin -> Seed 5th Edition on the live app instead:
 * it runs with Vercel's already-configured service role key, so nobody
 * has to hold that key locally. See lib/seed-5th-edition-core.ts's header
 * comment for what this does and doesn't seed.
 *
 *   SUPABASE_URL=... SUPABASE_SERVICE_ROLE_KEY=... npx tsx scripts/seed-5th-edition.ts
 */
import { createClient } from "@supabase/supabase-js";
import { randomBytes } from "node:crypto";
import { runFifthEditionSeed } from "../lib/seed-5th-edition-core";

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

runFifthEditionSeed(supabase, teamToken)
  .then((result) => {
    console.log(`Teams ready: ${result.teams}`);
    console.log(`Matches: ${result.matchesCreated} created, ${result.matchesUpdated} updated.`);
    console.log("Done. Quarterfinal/semifinal/final fixtures are not seeded — see lib/seed-5th-edition-core.ts.");
  })
  .catch((err) => {
    console.error(err);
    process.exit(1);
  });
