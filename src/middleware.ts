import { NextResponse, type NextRequest } from "next/server";

/**
 * Edge-level pre-check.
 *
 * This ONLY looks for the presence of a session cookie, so an unauthenticated
 * visitor is redirected before any server rendering happens. It is a
 * performance and UX optimisation, never an authorisation control: the real
 * checks (is the session valid, is it revoked, is the account active, does the
 * user hold the required role) all run server-side in the page and action
 * guards, which is where they cannot be bypassed by forging a cookie.
 */

const SESSION_COOKIE = "mon_session";

export function middleware(request: NextRequest) {
  const { pathname, search } = request.nextUrl;
  const hasSessionCookie = Boolean(request.cookies.get(SESSION_COOKIE)?.value);

  if (hasSessionCookie) return NextResponse.next();

  if (pathname.startsWith("/dashboard")) {
    const url = request.nextUrl.clone();
    url.pathname = "/login";
    url.search = `?next=${encodeURIComponent(pathname + search)}`;
    return NextResponse.redirect(url);
  }

  if (pathname.startsWith("/admin") && !pathname.startsWith("/admin/login")) {
    const url = request.nextUrl.clone();
    url.pathname = "/admin/login";
    url.search = `?next=${encodeURIComponent(pathname + search)}`;
    return NextResponse.redirect(url);
  }

  return NextResponse.next();
}

export const config = {
  matcher: ["/dashboard/:path*", "/admin/:path*"],
};
