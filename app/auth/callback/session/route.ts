import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { addAuthError, getSafeAuthDestination } from "@/lib/auth-redirect";

/**
 * Companion to /auth/callback's fragment bridge: receives the
 * access_token/refresh_token pulled from the URL fragment client-side and
 * establishes the real cookie-backed session, server-side, via setSession.
 */
export async function POST(request: Request) {
  const { origin } = new URL(request.url);

  let body: { access_token?: string; refresh_token?: string; next?: string };
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ redirect: "/login?error=callback" });
  }

  const next = getSafeAuthDestination(body.next ?? null, origin);

  if (!body.access_token || !body.refresh_token) {
    return NextResponse.json({ redirect: addAuthError(next, "expired") });
  }

  const supabase = createClient();
  const { error } = await supabase.auth.setSession({
    access_token: body.access_token,
    refresh_token: body.refresh_token,
  });

  if (error) {
    return NextResponse.json({ redirect: addAuthError(next, "expired") });
  }

  return NextResponse.json({ redirect: next });
}
