import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { CUSTOMER_COOKIE, verificarSesionCliente } from "@/lib/customer-auth";
import { prisma } from "@/lib/prisma";

export const runtime = "nodejs";

async function clienteAutenticado(request: NextRequest) {
  const accountId = await verificarSesionCliente(request.cookies.get(CUSTOMER_COOKIE)?.value);
  if (!accountId) return null;
  const account = await prisma.customerAccount.findUnique({ where: { id: accountId }, select: { email: true } });
  if (!account) return null;
  return prisma.customer.findUnique({ where: { email: account.email }, select: { id: true } });
}

export async function PATCH(request: NextRequest) {
  const customer = await clienteAutenticado(request);
  if (!customer) return NextResponse.json({ error: "Inicia sesión para administrar tus recordatorios" }, { status: 401 });
  const parsed = z.object({ id: z.number().int().positive(), accion: z.enum(["pausar", "reactivar", "cancelar"]) }).safeParse(await request.json().catch(() => null));
  if (!parsed.success) return NextResponse.json({ error: "Acción de recordatorio inválida" }, { status: 400 });
  const { id, accion } = parsed.data;
  if (accion === "reactivar") {
    const recordatorio = await prisma.subscription.findFirst({ where: { id, customerId: customer.id, estado: "pausada" }, select: { id: true, frecuenciaDias: true } });
    if (!recordatorio) return NextResponse.json({ error: "Este recordatorio ya no está disponible" }, { status: 404 });
    const updated = await prisma.subscription.updateMany({
      where: { id: recordatorio.id, customerId: customer.id, estado: "pausada" },
      data: { estado: "activa", proximaEntrega: new Date(Date.now() + recordatorio.frecuenciaDias * 24 * 60 * 60 * 1000) },
    });
    if (!updated.count) return NextResponse.json({ error: "Este recordatorio ya no está disponible" }, { status: 404 });
    return NextResponse.json({ ok: true });
  }
  const where = { id, customerId: customer.id, estado: { in: ["activa", "pausada"] } };
  const updated = await prisma.subscription.updateMany({
    where,
    data: accion === "pausar"
      ? { estado: "pausada" }
      : { estado: "cancelada" },
  });
  if (!updated.count) return NextResponse.json({ error: "Este recordatorio ya no está disponible" }, { status: 404 });
  return NextResponse.json({ ok: true });
}
