// ============================================================
//  API PATCH /api/admin/pedidos/[id] - Cambiar estado del pedido
//  (usado por el panel admin)
// ============================================================
import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { z } from "zod";
import { enviarMensajeAutomatico } from "@/lib/automation-email";

const UpdateSchema = z.object({
  estado: z.enum(["pendiente", "confirmado", "enviado", "entregado", "cancelado"]),
});

export async function PATCH(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params;
  try {
    const body = await req.json();
    const parsed = UpdateSchema.safeParse(body);
    if (!parsed.success) {
      return NextResponse.json({ error: "Estado inválido" }, { status: 400 });
    }
    const { estado } = parsed.data;
    const pedidoId = Number(id);
    if (!Number.isInteger(pedidoId) || pedidoId < 1) return NextResponse.json({ error: "Pedido inválido" }, { status: 400 });
    const cambio = await prisma.$transaction(async (tx) => {
      const actual = await tx.order.findUnique({ where: { id: pedidoId }, include: { customer: true } });
      if (!actual) return null;
      if (actual.estado === estado) return { mensajeId: null, estado: actual.estado };
      const actualizado = await tx.order.updateMany({ where: { id: pedidoId, estado: actual.estado }, data: { estado } });
      if (!actualizado.count) {
        const vigente = await tx.order.findUnique({ where: { id: pedidoId }, select: { estado: true } });
        return vigente ? { mensajeId: null, estado: vigente.estado } : null;
      }
      const mensaje = await tx.automationMessage.create({
        data: {
          tipo: "cambio_estado",
          destinatario: actual.customer.email,
          asunto: `Tu pedido ${actual.numero} ahora está ${estado} · Glasskin`,
          cuerpo: `Hola ${actual.customer.nombre},\n\nEl estado de tu pedido ${actual.numero} cambió a “${estado}”. Puedes ver los detalles iniciando sesión en tu cuenta Glasskin.\n\nEquipo Glasskin.`,
          orderId: actual.id,
        },
      });
      return { mensajeId: mensaje.id, estado };
    });
    if (!cambio) return NextResponse.json({ error: "Pedido no encontrado" }, { status: 404 });
    if (cambio.mensajeId) void enviarMensajeAutomatico(cambio.mensajeId);
    return NextResponse.json({ ok: true, estado: cambio.estado });
  } catch (e) {
    console.error("PATCH /api/admin/pedidos/[id] error:", e);
    return NextResponse.json({ error: "Error al actualizar" }, { status: 500 });
  }
}
