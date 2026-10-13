import { getSessionCookie } from "better-auth/cookies";
import { NextResponse, type NextRequest } from "next/server";

const PRIVATE_PREFIXES = ["/painel", "/habitos", "/configuracoes"];
const GUEST_ONLY = ["/", "/entrar", "/cadastro"];

/**
 * Optimistic redirects based only on the presence of the session cookie.
 * Pages and Server Actions still validate the session themselves.
 */
export function proxy(request: NextRequest) {
  const { pathname } = request.nextUrl;
  const hasSession = Boolean(getSessionCookie(request));

  if (!hasSession && PRIVATE_PREFIXES.some((prefix) => pathname.startsWith(prefix))) {
    return NextResponse.redirect(new URL("/entrar", request.url));
  }
  if (hasSession && GUEST_ONLY.includes(pathname)) {
    return NextResponse.redirect(new URL("/painel", request.url));
  }
  return NextResponse.next();
}

export const config = {
  matcher: ["/", "/entrar", "/cadastro", "/painel/:path*", "/habitos/:path*", "/configuracoes/:path*"],
};
