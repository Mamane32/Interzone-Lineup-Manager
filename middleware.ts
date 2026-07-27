import { NextResponse, type NextRequest } from "next/server";
import { updateSession } from "@/lib/supabase/middleware";

// Sub-paths under /team/<token>/... that must stay reachable WITHOUT a
// session — the premium landing page, login, and password-recovery flows.
const PUBLIC_COACH_SUBPATHS = ["", "/login", "/forgot-password"];

export async function middleware(request: NextRequest) {
  const { pathname } = request.nextUrl;
  const { response, user } = await updateSession(request);

  // --- Admin area + Live Center ------------------------------------------
  // The Live Center (/live/...) is operated by the same single administrator
  // account as /admin — there's no separate "broadcast operator" role in
  // this system, so it reuses the exact same auth gate.
  const isAdminLoginRoute = pathname.startsWith("/admin/login");
  const isAdminOrLive = pathname.startsWith("/admin") || pathname.startsWith("/live");
  if (isAdminOrLive && !isAdminLoginRoute && !user) {
    return NextResponse.redirect(new URL("/admin/login", request.url));
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

export const config = {
  matcher: ["/admin/:path*", "/team/:path*", "/live/:path*"],
};
