import fs from "node:fs";
import path from "node:path";
import { describe, expect, it } from "vitest";

const supabaseDir = path.join(process.cwd(), "supabase");
const migrationsDir = path.join(supabaseDir, "migrations");

function withoutComments(sql: string): string {
  return sql
    .replace(/\/\*[\s\S]*?\*\//g, "")
    .replace(/--.*$/gm, "");
}

describe("migration integrity", () => {
  it("keeps the approved migration sequence complete and ordered", () => {
    const files = fs
      .readdirSync(migrationsDir)
      .filter((file) => file.endsWith(".sql"))
      .sort();

    expect(files).toEqual([
      "002_live_center.sql",
      "003_unified_access.sql",
      "004_iam_foundation.sql",
      "005_iam_hardening.sql",
      "006_competition_foundation.sql",
      "007_tactical_formations.sql",
      "008_competition_completion.sql",
      "009_formation_engine.sql",
      "010_coach_photo.sql",
      "011_additional_time_event.sql",
      "012_image_upload_buckets.sql",
      "013_production_queue.sql",
      "014_match_officials.sql",
      "015_match_statistics.sql",
      "016_access_status_archived.sql",
      "017_asset_buckets.sql",
      "018_invitation_status_archived.sql",
      "019_find_auth_user_by_email.sql",
      "020_player_roster_fields.sql",
      "021_competition_squad_rules.sql",
      "022_platform_branding.sql",
    ]);
  });

  it("preserves the existing additive-only migration discipline", () => {
    const migrationSql = fs
      .readdirSync(migrationsDir)
      .filter((file) => file.endsWith(".sql"))
      .map((file) => fs.readFileSync(path.join(migrationsDir, file), "utf8"))
      .map(withoutComments)
      .join("\n");

    expect(migrationSql).not.toMatch(/\bdrop\s+table\b/i);
    expect(migrationSql).not.toMatch(/\bdrop\s+column\b/i);
    expect(migrationSql).not.toMatch(/\brename\s+(?:table|column)\b/i);
    expect(migrationSql).not.toMatch(/\balter\s+column\b/i);
  });

  it("enables row-level security for every application table", () => {
    const sqlFiles = [
      path.join(supabaseDir, "schema.sql"),
      ...fs
        .readdirSync(migrationsDir)
        .filter((file) => file.endsWith(".sql"))
        .sort()
        .map((file) => path.join(migrationsDir, file)),
    ];
    const allSql = sqlFiles.map((file) => withoutComments(fs.readFileSync(file, "utf8"))).join("\n");
    const tables = [
      ...allSql.matchAll(/\bcreate\s+table(?:\s+if\s+not\s+exists)?\s+([a-z_][a-z0-9_]*)/gi),
    ].map((match) => match[1]);

    expect(tables.length).toBeGreaterThan(0);
    for (const table of tables) {
      expect(allSql).toMatch(
        new RegExp(`alter\\s+table\\s+${table}\\s+enable\\s+row\\s+level\\s+security`, "i")
      );
    }
  });
});
