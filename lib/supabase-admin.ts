import "server-only";
import { createClient } from "@supabase/supabase-js";

// This client uses the SERVICE ROLE key and must never be imported from a
// "use client" file or exposed to the browser. Every table has RLS enabled
// with no public policies (see supabase/schema.sql) — this is the only
// client in the app that can read or write data, and it only ever runs in
// Server Components / Server Actions / Route Handlers.
export function supabaseAdmin() {
  const url = process.env.SUPABASE_URL;
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY;

  if (!url || !key) {
    throw new Error(
      "Missing SUPABASE_URL or SUPABASE_SERVICE_ROLE_KEY environment variables."
    );
  }

  return createClient(url, key, {
    auth: { persistSession: false, autoRefreshToken: false },
  });
}
