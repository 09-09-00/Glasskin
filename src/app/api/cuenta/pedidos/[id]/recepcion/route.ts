import { NextRequest, NextResponse } from "next/server";
import { createHash } from "node:crypto";
import { CUSTOMER_COOKIE, verificarSesionCliente } from "@/lib/customer-auth";
import { prisma } from "@/lib/prisma";

export async function PATCH(request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const accountId = await verificarSesionCliente(request.cookies.get(CUSTOMER_COOKIE)?.value);
  const id = Number((await params).id);
  if (!Number.isInteger(id) || id < 1) return NextResponse.json({ error: "Pedido inválido." }, { status: 400 });
  try {
    const token = request.cookies.get(`glasskin_recibo_${id}`)?.value;
    const receiptHash = token ? createHash("sha256").update(token).digest("hex") : null;
    const permisoInvitado = receiptHash
      ? await prisma.order.findFirst({ where: { id, reciboTokenHash: receiptHash }, select: { id: true } })
      : null;
    if (!accountId && !permisoInvitado) return NextResponse.json({ error: "Abre la página de confirmación de tu pedido en este dispositivo." }, { status: 401 });
    const ownership = [
      ...(accountId ? [{ accountId }] : []),
      ...(permisoInvitado ? [{ reciboTokenHash: receiptHash! }] : []),
    ];
    const resultado = await prisma.order.updateMany({
      where: { id, OR: ownership, estado: "enviado", recibidoPorClienteAt: null },
      data: { estado: "entregado", recibidoPorClienteAt: new Date() },
    });
    if (!resultado.count) {
      const pedido = await prisma.order.findFirst({ where: { id, OR: ownership }, select: { estado: true, recibidoPorClienteAt: true } });
      if (!pedido) return NextResponse.json({ error: "No encontramos ese pedido." }, { status: 404 });
      if (pedido.recibidoPorClienteAt) return NextResponse.json({ ok: true, estado: "entregado", recibidoPorClienteAt: pedido.recibidoPorClienteAt });
      return NextResponse.json({ error: "Podrás confirmar cuando el pedido esté marcado como enviado." }, { status: 409 });
    }
    const recibidoPorClienteAt = new Date();
    return NextResponse.json({ ok: true, estado: "entregado", recibidoPorClienteAt });
  } catch (error) {
    console.error("PATCH /api/cuenta/pedidos/[id]/recepcion error:", error);
    return NextResponse.json({ error: "No se pudo confirmar la recepción. Intenta de nuevo." }, { status: 503 });
  }
}
