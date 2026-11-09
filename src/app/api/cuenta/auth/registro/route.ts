import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { prisma } from "@/lib/prisma";
import { crearSesionCliente, CUSTOMER_COOKIE, CUSTOMER_SESSION_SECONDS, hashCustomerPassword } from "@/lib/customer-auth";

export const runtime = "nodejs";

const Schema = z.object({
  nombre: z.string().trim().min(2).max(100),
  email: z.string().trim().email().max(254),
  telefono: z.string().trim().max(40).optional().default(""),
  password: z.string().min(12).max(200),
});

export async function POST(request: NextRequest) {
  const parsed = Schema.safeParse(await request.json().catch(() => null));
  if (!parsed.success) return NextResponse.json({ error: parsed.error.issues[0]?.message ?? "Revisa tus datos" }, { status: 400 });
  try {
    const email = parsed.data.email.toLowerCase();
    const passwordHash = await hashCustomerPassword(parsed.data.password);
    const account = await prisma.customerAccount.create({
      data: { nombre: parsed.data.nombre, email, telefono: parsed.data.telefono || null, passwordHash },
      select: { id: true },
    });
    const response = NextResponse.json({ ok: true });
    response.cookies.set({ name: CUSTOMER_COOKIE, value: await crearSesionCliente(account.id), httpOnly: true, sameSite: "lax", secure: request.nextUrl.protocol === "https:", maxAge: CUSTOMER_SESSION_SECONDS, path: "/" });
    return response;
  } catch (error) {
    if (error && typeof error === "object" && "code" in error && error.code === "P2002") {
      return NextResponse.json({ error: "Ya existe una cuenta con ese correo. Inicia sesión." }, { status: 409 });
    }
    console.error("POST /api/cuenta/auth/registro error:", error);
    return NextResponse.json({ error: "No se pudo crear tu cuenta" }, { status: 500 });
  }
}
