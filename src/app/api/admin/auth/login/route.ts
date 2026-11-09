import { timingSafeEqual } from "node:crypto";
import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { ADMIN_COOKIE, ADMIN_SESSION_SECONDS, crearSesionAdmin } from "@/lib/admin-auth";

const LoginSchema = z.object({
  usuario: z.string().min(1).max(100),
  clave: z.string().min(1).max(200),
});

function coincide(actual: string, esperado: string) {
  const a = Buffer.from(actual);
  const b = Buffer.from(esperado);
  return a.length === b.length && timingSafeEqual(a, b);
}

export async function POST(request: NextRequest) {
  const usuarioEsperado = process.env.ADMIN_USER?.trim();
  const claveEsperada = process.env.ADMIN_PASSWORD?.trim();
  const secret = process.env.ADMIN_SESSION_SECRET?.trim();
  if (!usuarioEsperado || !claveEsperada || !secret) {
    return NextResponse.json(
      { error: "Configura ADMIN_USER, ADMIN_PASSWORD y ADMIN_SESSION_SECRET en .env" },
      { status: 503 },
    );
  }

  const parsed = LoginSchema.safeParse(await request.json().catch(() => null));
  if (!parsed.success) {
    return NextResponse.json({ error: "Completa usuario y contraseña" }, { status: 400 });
  }
  if (
    !coincide(parsed.data.usuario, usuarioEsperado) ||
    !coincide(parsed.data.clave, claveEsperada)
  ) {
    return NextResponse.json({ error: "Credenciales incorrectas" }, { status: 401 });
  }

  const response = NextResponse.json({ ok: true });
  response.cookies.set({
    name: ADMIN_COOKIE,
    value: await crearSesionAdmin(usuarioEsperado, secret),
    httpOnly: true,
    sameSite: "strict",
    // En localhost se sirve por HTTP incluso con NODE_ENV=production.
    // En un despliegue HTTPS la cookie se marca segura automáticamente.
    secure: request.nextUrl.protocol === "https:",
    maxAge: ADMIN_SESSION_SECONDS,
    path: "/",
  });
  return response;
}
