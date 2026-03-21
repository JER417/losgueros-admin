import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";

/**
 * Middleware de protección de rutas — se ejecuta en el servidor (Edge Runtime).
 * Si no hay cookie authToken, redirige al login antes de renderizar la página.
 * Esto evita el "flash" de contenido no autenticado que ocurre con solo useEffect en el cliente.
 */
export function middleware(request: NextRequest) {
  const { pathname } = request.nextUrl;

  // Rutas públicas que no requieren autenticación
  const publicPaths = ["/login"];
  if (publicPaths.some((p) => pathname.startsWith(p))) {
    return NextResponse.next();
  }

  // Verificar cookie de sesión
  const authToken = request.cookies.get("authToken")?.value;

  if (!authToken) {
    const loginUrl = new URL("/login", request.url);
    // Guardar la URL original para redirigir de vuelta después del login
    loginUrl.searchParams.set("from", pathname);
    return NextResponse.redirect(loginUrl);
  }

  return NextResponse.next();
}

// Aplica el middleware solo a rutas del dashboard
export const config = {
  matcher: ["/dashboard/:path*"],
};