import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { CUSTOMER_COOKIE, verificarSesionCliente } from "@/lib/customer-auth";
import { prisma } from "@/lib/prisma";

export const runtime = "nodejs";

const PasoSchema = z.object({
  orden: z.number().int().min(1).max(20),
  nombre: z.string().trim().min(1).max(100),
  productoId: z.number().int().positive().nullable(),
  productoNombre: z.string().max(180).nullable(),
  instrucciones: z.string().trim().min(1).max(700),
  esperaMinutos: z.number().int().min(0).max(120).optional(),
});

const RutinaSchema = z.object({
  manana: z.array(PasoSchema).max(12),
  noche: z.array(PasoSchema).max(12),
  consejos: z.array(z.string().trim().max(400)).max(12),
  mejoras: z.array(z.string().trim().max(400)).max(12),
  avisos: z.array(z.string().trim().max(400)).max(12),
});

export async function POST(request: NextRequest) {
  const accountId = await verificarSesionCliente(request.cookies.get(CUSTOMER_COOKIE)?.value);
  if (!accountId) return NextResponse.json({ error: "Inicia sesión para guardar tu rutina" }, { status: 401 });
  const parsed = z.object({ rutina: RutinaSchema }).safeParse(await request.json().catch(() => null));
  if (!parsed.success) return NextResponse.json({ error: "No pudimos guardar esta rutina. Vuelve a generarla e intenta otra vez." }, { status: 400 });

  const account = await prisma.customerAccount.updateMany({
    where: { id: accountId, consentimientoPersonalizacion: true },
    data: { rutinaGuardada: JSON.stringify(parsed.data.rutina), rutinaGuardadaAt: new Date() },
  });
  if (!account.count) return NextResponse.json({ error: "Activa la memoria de rutina desde Mi perfil antes de guardarla." }, { status: 403 });
  return NextResponse.json({ ok: true, guardada: true });
}
