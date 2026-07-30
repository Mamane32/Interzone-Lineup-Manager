import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { addAuthError, getSafeAuthDestination } from "@/lib/auth-redirect";

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
  const next = getSafeAuthDestination(searchParams.get("next"), origin);
  const providerError = searchParams.get("error") ?? searchParams.get("error_code");

  if (providerError || !code) {
    return NextResponse.redirect(new URL(addAuthError(next, "expired"), origin));
  }

  try {
    const supabase = createClient();
    const { error } = await supabase.auth.exchangeCodeForSession(code);
    if (error) {
      return NextResponse.redirect(new URL(addAuthError(next, "expired"), origin));
    }
  } catch {
    return NextResponse.redirect(new URL(addAuthError(next, "callback"), origin));
  }

  return NextResponse.redirect(new URL(next, origin));
}
