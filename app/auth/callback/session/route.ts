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

  const requestMeta = {
    time: new Date().toISOString(),
    userAgent: request.headers.get("user-agent"),
    ip: request.headers.get("x-forwarded-for") ?? request.headers.get("x-real-ip"),
    // Fragment tokens aren't a short code like the PKCE path, so a hash-free
    // prefix would be too long to safely log — the access token's own first
    // 8 chars are enough to correlate repeated hits without logging a
    // usable secret in full.
    correlationId: body.access_token ? body.access_token.slice(0, 8) : null,
    next,
  };

  const supabase = createClient();
  const { error } = await supabase.auth.setSession({
    access_token: body.access_token,
    refresh_token: body.refresh_token,
  });

  if (error) {
    // Logged deliberately — same diagnostic gap as auth/callback/route.ts:
    // the real GoTrue reason was previously discarded behind a generic
    // "expired" redirect.
    console.error("auth/callback/session: setSession failed", {
      ...requestMeta,
      errorCode: error.code,
      status: error.status,
      message: error.message,
    });
    return NextResponse.json({ redirect: addAuthError(next, "expired") });
  }

  console.info("auth/callback/session: setSession succeeded", requestMeta);
  return NextResponse.json({ redirect: next });
}
