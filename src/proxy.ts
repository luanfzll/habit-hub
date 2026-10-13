import { getSessionCookie } from "better-auth/cookies";
import { NextResponse, type NextRequest } from "next/server";

const PRIVATE_PREFIXES = ["/painel", "/habitos", "/configuracoes"];

/**
 * Optimistic redirects based only on the presence of the session cookie.
 * Pages and Server Actions still validate the session themselves.
 *
 * The cookie may belong to a session that has expired or was revoked, so the
 * sign-in and sign-up pages are never redirected: a private page that finds no
 * valid session sends the visitor there, and bouncing them back would loop.
 */
export function proxy(request: NextRequest) {
  const { pathname } = request.nextUrl;
  const hasSession = Boolean(getSessionCookie(request));

  if (!hasSession && PRIVATE_PREFIXES.some((prefix) => pathname.startsWith(prefix))) {
    return NextResponse.redirect(new URL("/entrar", request.url));
  }
  if (hasSession && pathname === "/") {
    return NextResponse.redirect(new URL("/painel", request.url));
  }
  return NextResponse.next();
}

export const config = {
  matcher: ["/", "/entrar", "/cadastro", "/painel/:path*", "/habitos/:path*", "/configuracoes/:path*"],
};
