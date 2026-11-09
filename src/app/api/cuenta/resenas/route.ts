import { NextRequest, NextResponse } from "next/server";
import { createHash } from "node:crypto";
import { z } from "zod";
import { CUSTOMER_COOKIE, verificarSesionCliente } from "@/lib/customer-auth";
import { prisma } from "@/lib/prisma";

const Schema = z.object({
  orderId: z.number().int().positive(),
  productId: z.number().int().positive(),
  rating: z.number().int().min(1).max(5),
  comment: z.string().trim().min(10, "Escribe al menos 10 caracteres.").max(1200, "El comentario no puede superar 1.200 caracteres."),
});

export async function POST(request: NextRequest) {
  const accountId = await verificarSesionCliente(request.cookies.get(CUSTOMER_COOKIE)?.value);
  const parsed = Schema.safeParse(await request.json().catch(() => null));
  if (!parsed.success) return NextResponse.json({ error: parsed.error.issues[0]?.message ?? "Revisa la reseña." }, { status: 400 });

  const { orderId, productId, rating, comment } = parsed.data;
  try {
    const receiptToken = request.cookies.get(`glasskin_recibo_${orderId}`)?.value;
    const receiptHash = receiptToken ? createHash("sha256").update(receiptToken).digest("hex") : null;
    const ownership = [
      ...(accountId ? [{ accountId }] : []),
      ...(receiptHash ? [{ reciboTokenHash: receiptHash }] : []),
    ];
    if (ownership.length === 0) {
      return NextResponse.json({ error: "Inicia sesión o abre el comprobante de tu compra para dejar una reseña." }, { status: 401 });
    }
    const pedido = await prisma.order.findFirst({
      where: { id: orderId, OR: ownership, estado: "entregado", items: { some: { productId } } },
      select: { id: true, customerId: true },
    });
    if (!pedido) return NextResponse.json({ error: "Solo puedes reseñar productos de un pedido tuyo marcado como recibido." }, { status: 403 });

    const review = await prisma.productReview.create({ data: { orderId, productId, customerId: pedido.customerId, rating, comment } });
    return NextResponse.json({ ok: true, review: { id: review.id, rating: review.rating, comment: review.comment, createdAt: review.createdAt } }, { status: 201 });
  } catch (error) {
    if (error && typeof error === "object" && "code" in error && error.code === "P2002") {
      return NextResponse.json({ error: "Ya dejaste una reseña para este producto en ese pedido." }, { status: 409 });
    }
    console.error("POST /api/cuenta/resenas error:", error);
    return NextResponse.json({ error: "No se pudo guardar la reseña. Intenta de nuevo." }, { status: 503 });
  }
}
