import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";

/**
 * Supabase's invite and password-recovery emails redirect here with a
 * `?code=` (PKCE flow). Exchanging it for a session has to happen in a
 * Route Handler — Server Component renders can't set cookies, only Route
 * Handlers and Server Actions can — which is why this exists as its own
 * route instead of doing the exchange directly on /team/reset-password.
 */
export async function GET(request: Request) {
  const { searchParams, origin } = new URL(request.url);
  const code = searchParams.get("code");
  const next = searchParams.get("next") ?? "/team/reset-password";

  if (code) {
    const supabase = createClient();
    await supabase.auth.exchangeCodeForSession(code);
  }

  return NextResponse.redirect(`${origin}${next}`);
}
