import "server-only";
import { supabaseAdmin } from "@/lib/supabase-admin";
import { generateTeamToken } from "@/lib/token";
import { runFifthEditionSeed, type SeedResult } from "@/lib/seed-5th-edition-core";

/**
 * Runs the 5th Edition seed (lib/seed-5th-edition-core.ts) using the app's
 * own supabaseAdmin() — Vercel's already-configured
 * SUPABASE_SERVICE_ROLE_KEY, not a key anyone has to paste anywhere. Called
 * from Admin -> Seed 5th Edition (app/admin/seed-5th-edition), gated to
 * super_admin there. Safe to run more than once.
 */
export async function seedFifthEdition(): Promise<SeedResult> {
  return runFifthEditionSeed(supabaseAdmin(), generateTeamToken);
}
