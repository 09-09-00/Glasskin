import { NextRequest, NextResponse } from "next/server";
import { ADMIN_COOKIE, verificarSesionAdmin } from "@/lib/admin-auth";

function respuestaApi(status: number, error: string) {
  return NextResponse.json({ error }, { status });
}

export async function middleware(request: NextRequest) {
  const path = request.nextUrl.pathname;
  const esApi = path.startsWith("/api/");
  const esLogin = path.startsWith("/api/admin/auth/");

  if (path.startsWith("/api/videos") && request.method === "GET") {
    return NextResponse.next();
  }
  if (esLogin) return NextResponse.next();

  const usuario = process.env.ADMIN_USER?.trim();
  const clave = process.env.ADMIN_PASSWORD?.trim();
  const secret = process.env.ADMIN_SESSION_SECRET?.trim();
  if (!usuario || !clave || !secret) {
    if (esApi) return respuestaApi(503, "Configura las credenciales administrativas");
    const loginUrl = new URL("/propietario/login", request.url);
    loginUrl.searchParams.set("config", "faltante");
    return NextResponse.redirect(loginUrl);
  }

  const token = request.cookies.get(ADMIN_COOKIE)?.value;
  if (token && (await verificarSesionAdmin(token, secret))) {
    return NextResponse.next();
  }

  if (esApi) return respuestaApi(401, "Sesión administrativa requerida");
  const loginUrl = new URL("/propietario/login", request.url);
  loginUrl.searchParams.set("next", `${path}${request.nextUrl.search}`);
  return NextResponse.redirect(loginUrl);
}

export const config = {
  matcher: ["/admin/:path*", "/api/admin/:path*", "/api/videos/:path*"],
};
