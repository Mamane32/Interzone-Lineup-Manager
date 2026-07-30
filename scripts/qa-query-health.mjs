import fs from "node:fs";
import path from "node:path";
import nextEnv from "@next/env";
import { createClient } from "@supabase/supabase-js";

const { loadEnvConfig } = nextEnv;
loadEnvConfig(process.cwd());

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL,
  process.env.SUPABASE_SERVICE_ROLE_KEY,
  { auth: { persistSession: false, autoRefreshToken: false } }
);

function walk(directory) {
  return fs.readdirSync(directory, { withFileTypes: true }).flatMap((entry) => {
    const entryPath = path.join(directory, entry.name);
    if (entry.isDirectory()) return walk(entryPath);
    return /\.(ts|tsx)$/.test(entry.name) ? [entryPath] : [];
  });
}

const files = [...walk("app"), ...walk("lib")];
const tables = [
  ...new Set(
    files.flatMap((file) =>
      [...fs.readFileSync(file, "utf8").matchAll(/\.from\(["']([^"']+)["']\)/g)].map(
        (match) => match[1]
      )
    )
  ),
]
  .filter((table) => table !== "team-logos")
  .sort();

const results = [];
for (const table of tables) {
  const { count, error } = await supabase
    .from(table)
    .select("*", { count: "exact", head: true });
  results.push({ table, count, error: error?.message ?? null });
}

console.log(JSON.stringify(results, null, 2));
if (results.some((result) => result.error)) process.exitCode = 1;
