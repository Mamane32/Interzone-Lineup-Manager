import { NextResponse, type NextRequest } from "next/server";
import { updateSession } from "@/lib/supabase/middleware";

// Sub-paths under /team/<token>/... that must stay reachable WITHOUT a
// session — the premium landing page, login, and password-recovery flows.
const PUBLIC_COACH_SUBPATHS = ["", "/login", "/forgot-password"];

// Route prefixes that only require "is someone logged in" at the
// middleware layer. Per Sprint 1.2: "Middleware should primarily verify
// authentication/session presence. Detailed authorization should also be
// validated server-side in protected layouts, pages, route handlers" —
// the actual role checks for each of these live in lib/access.ts's
// requireRole()/requireAdmin(), called from the page/layout itself.
const SESSION_ONLY_PROTECTED_PREFIXES = ["/admin", "/live", "/select-workspace", "/competition", "/referee", "/media", "/viewer"];

export async function middleware(request: NextRequest) {
  const { pathname } = request.nextUrl;
  const { response, user } = await updateSession(request);

  // --- Admin, Live Center, workspace picker, and role-specific portals ----
  const isAdminLoginRoute = pathname.startsWith("/admin/login");
  const isSessionOnlyProtected = SESSION_ONLY_PROTECTED_PREFIXES.some((p) => pathname.startsWith(p));
  if (isSessionOnlyProtected && !isAdminLoginRoute && !user) {
    // /admin keeps redirecting to its own login for backward compatibility;
    // everything else routes through the new unified login.
    const destination = pathname.startsWith("/admin") ? "/admin/login" : "/login";
    return NextResponse.redirect(new URL(destination, request.url));
  }
  if (isAdminLoginRoute && user) {
    return NextResponse.redirect(new URL("/admin/dashboard", request.url));
  }

  // --- Coach area (/team/<token>/...) -----------------------------------
  // /team/reset-password is a separate static route and is always public;
  // it isn't matched by this pattern.
  const teamMatch = pathname.match(/^\/team\/([^/]+)(\/.*)?$/);
  if (teamMatch) {
    const token = teamMatch[1];
    const sub = teamMatch[2] ?? "";
    const isPublicSubpath = PUBLIC_COACH_SUBPATHS.some((p) => sub === p);

    if (!isPublicSubpath && !user) {
      return NextResponse.redirect(new URL(`/team/${token}/login`, request.url));
    }
    // Note: middleware only confirms *someone* is logged in. Per-team
    // ownership (coach A can't view coach B's data) is enforced in
    // lib/coach-auth.ts on every protected page, which also has to look the
    // team up anyway.
  }

  return response;
}

// Runs on every route except static assets, so the Supabase session cookie
// is refreshed on every real navigation — not just on routes this app
// happens to enforce access on. Previously this matcher was an allow-list of
// specific prefixes; several real, regularly-visited routes fell outside it
// (/, /match/[matchId], /broadcast-output/*, /invitation, /api/live/*), so
// the session was silently never refreshed while a user was on any of them —
// the confirmed root cause of intermittent logout on refresh/back/navigation.
// Widening this does not change what's protected: the redirect logic in
// middleware() above still only fires for the same routes it always did
// (SESSION_ONLY_PROTECTED_PREFIXES, /team/) — this only changes when the
// session gets refreshed.
//
// /auth/callback and /auth/callback/session are deliberately excluded here —
// they establish a brand-new session (exchangeCodeForSession/setSession),
// they never need an existing one refreshed, and this exclusion removes the
// one variable that changed on the day intermittent "reset link already
// invalid" reports started, while a live-tested root cause is still being
// confirmed (see the new logging in both route handlers).
export const config = {
  matcher: ["/((?!_next/static|_next/image|favicon\\.ico|auth/callback|.*\\.(?:svg|png|jpg|jpeg|gif|webp|ico)$).*)"],
};
