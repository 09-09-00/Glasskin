import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { crearSesionCliente, CUSTOMER_COOKIE, CUSTOMER_SESSION_SECONDS, verifyCustomerPassword } from "@/lib/customer-auth";
import { prisma } from "@/lib/prisma";

export const runtime = "nodejs";

const Schema = z.object({ email: z.string().trim().email().max(254), password: z.string().min(1).max(200) });

export async function POST(request: NextRequest) {
  const parsed = Schema.safeParse(await request.json().catch(() => null));
  if (!parsed.success) return NextResponse.json({ error: "Escribe un correo y una contraseña válidos" }, { status: 400 });
  const account = await prisma.customerAccount.findUnique({ where: { email: parsed.data.email.toLowerCase() } });
  const valida = account ? await verifyCustomerPassword(parsed.data.password, account.passwordHash) : false;
  if (!account || !valida) return NextResponse.json({ error: "Correo o contraseña incorrectos" }, { status: 401 });
  const response = NextResponse.json({ ok: true });
  response.cookies.set({ name: CUSTOMER_COOKIE, value: await crearSesionCliente(account.id), httpOnly: true, sameSite: "lax", secure: request.nextUrl.protocol === "https:", maxAge: CUSTOMER_SESSION_SECONDS, path: "/" });
  return response;
}
