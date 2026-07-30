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
