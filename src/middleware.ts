// src/middleware.ts
import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";

export function middleware(request: NextRequest) {
  const { pathname } = request.nextUrl;

  const publicPaths = ["/login"];
  if (publicPaths.some((p) => pathname.startsWith(p))) {
    return NextResponse.next();
  }

  const authToken = request.cookies.get("authToken")?.value;

  // FIX #3: verificar formato JWT mínimo (3 partes separadas por ".")
  // Un token válido siempre tiene la forma: xxxxx.yyyyy.zzzzz
  const isValidJwt = authToken && authToken.split(".").length === 3;

  if (!isValidJwt) {
    const loginUrl = new URL("/login", request.url);
    loginUrl.searchParams.set("from", pathname);
    return NextResponse.redirect(loginUrl);
  }

  return NextResponse.next();
}

export const config = {
  matcher: ["/dashboard/:path*"],
};
