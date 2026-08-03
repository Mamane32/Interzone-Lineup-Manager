import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { addAuthError, getSafeAuthDestination } from "@/lib/auth-redirect";

/**
 * Supabase's invite and password-recovery emails redirect here. Depending
 * on the project's auth flow settings this arrives as either a `?code=`
 * (PKCE — exchanged for a session right here, server-side) or session
 * tokens in the URL **fragment** (`#access_token=...&refresh_token=...`,
 * implicit grant) — fragments never reach the server, so that case is
 * handed off to a tiny client-side bridge that reads the fragment and
 * posts it to /auth/callback/session. Exchanging a code for a session has
 * to happen in a Route Handler — Server Component renders can't set
 * cookies, only Route Handlers and Server Actions can — which is why this
 * exists as its own route instead of doing the exchange directly on
 * /team/reset-password.
 */
/**
 * Just enough of the code to correlate multiple hits against the same
 * one-time token in logs (e.g. a prefetch followed by the real click) —
 * deliberately not the full code, since it's a live single-use secret and
 * this project logs no more of it than needed to answer "was this the same
 * token twice."
 */
function correlationId(code: string): string {
  return code.slice(0, 8);
}

export async function GET(request: Request) {
  const { searchParams, origin } = new URL(request.url);
  const code = searchParams.get("code");
  const next = getSafeAuthDestination(searchParams.get("next"), origin);
  const providerError = searchParams.get("error") ?? searchParams.get("error_code");
  const providerErrorDescription = searchParams.get("error_description");

  // Logged on every hit, success or failure — this is what actually lets us
  // tell a prefetch apart from a real click: two hits against the same
  // correlationId, with the user-agent/IP of the *first* one, is direct
  // evidence, not inference. Previously this route only logged failures, so
  // a silent first (prefetch) success followed by a failed second (real)
  // click was invisible — only the failure ever showed up.
  const requestMeta = {
    time: new Date().toISOString(),
    userAgent: request.headers.get("user-agent"),
    ip: request.headers.get("x-forwarded-for") ?? request.headers.get("x-real-ip"),
    correlationId: code ? correlationId(code) : null,
    next,
  };

  if (providerError) {
    console.error("auth/callback: provider-reported error", { ...requestMeta, providerError, providerErrorDescription });
    return NextResponse.redirect(new URL(addAuthError(next, "expired"), origin));
  }

  if (code) {
    try {
      const supabase = createClient();
      const { error } = await supabase.auth.exchangeCodeForSession(code);
      if (error) {
        console.error("auth/callback: exchangeCodeForSession failed", {
          ...requestMeta,
          errorCode: error.code,
          status: error.status,
          message: error.message,
        });
        return NextResponse.redirect(new URL(addAuthError(next, "expired"), origin));
      }
      console.info("auth/callback: exchangeCodeForSession succeeded", requestMeta);
    } catch (err) {
      console.error("auth/callback: exchangeCodeForSession threw", { ...requestMeta, err });
      return NextResponse.redirect(new URL(addAuthError(next, "callback"), origin));
    }
    return NextResponse.redirect(new URL(next, origin));
  }

  // No `code` — fall back to the fragment bridge (see comment above).
  const expiredRedirect = addAuthError(next, "expired");
  const callbackErrorRedirect = addAuthError(next, "callback");
  const html = `<!doctype html>
<html><head><meta charset="utf-8" /><title>Signing you in…</title></head>
<body>
<script>
(function () {
  var hash = window.location.hash ? window.location.hash.slice(1) : "";
  var params = new URLSearchParams(hash);
  var accessToken = params.get("access_token");
  var refreshToken = params.get("refresh_token");
  if (!accessToken || !refreshToken) {
    window.location.replace(${JSON.stringify(expiredRedirect)});
    return;
  }
  fetch("/auth/callback/session", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ access_token: accessToken, refresh_token: refreshToken, next: ${JSON.stringify(next)} }),
  })
    .then(function (res) { return res.json(); })
    .then(function (data) { window.location.replace(data.redirect || ${JSON.stringify(next)}); })
    .catch(function () { window.location.replace(${JSON.stringify(callbackErrorRedirect)}); });
})();
</script>
</body></html>`;

  return new NextResponse(html, { headers: { "content-type": "text/html; charset=utf-8" } });
}
