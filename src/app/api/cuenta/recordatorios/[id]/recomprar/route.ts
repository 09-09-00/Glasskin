import { NextRequest, NextResponse } from "next/server";
import { CUSTOMER_COOKIE, verificarSesionCliente } from "@/lib/customer-auth";
import { prisma } from "@/lib/prisma";

export const runtime = "nodejs";

export async function POST(request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const accountId = await verificarSesionCliente(request.cookies.get(CUSTOMER_COOKIE)?.value);
  if (!accountId) return NextResponse.json({ error: "Inicia sesión para revisar tu recordatorio" }, { status: 401 });

  const { id } = await params;
  const recordatorioId = Number(id);
  if (!Number.isInteger(recordatorioId) || recordatorioId < 1) {
    return NextResponse.json({ error: "Recordatorio inválido" }, { status: 400 });
  }

  try {
    const account = await prisma.customerAccount.findUnique({ where: { id: accountId }, select: { email: true } });
    if (!account) return NextResponse.json({ error: "Inicia sesión para revisar tu recordatorio" }, { status: 401 });
    const customer = await prisma.customer.findUnique({ where: { email: account.email }, select: { id: true } });
    if (!customer) return NextResponse.json({ error: "No encontramos los datos de tu cuenta" }, { status: 404 });

    const recordatorio = await prisma.subscription.findFirst({
      where: { id: recordatorioId, customerId: customer.id, estado: "activa", proximaEntrega: { lte: new Date() } },
      select: {
        product: {
          select: {
            id: true,
            slug: true,
            nombre: true,
            precio: true,
            imagen: true,
            activo: true,
            stock: true,
            brand: { select: { nombre: true } },
          },
        },
      },
    });

    if (!recordatorio) {
      return NextResponse.json({ error: "Este recordatorio todavía no está listo o ya no está disponible" }, { status: 404 });
    }

    const product = recordatorio.product;
    if (!product.activo || product.stock <= 0) {
      return NextResponse.json({ error: "Este producto está agotado por ahora. Puedes volver a revisar más adelante." }, { status: 409 });
    }

    return NextResponse.json({
      ok: true,
      producto: {
        id: product.id,
        slug: product.slug,
        nombre: product.nombre,
        marca: product.brand.nombre,
        precio: product.precio,
        imagen: product.imagen,
        stock: product.stock,
      },
    });
  } catch (error) {
    console.error("POST /api/cuenta/recordatorios/[id]/recomprar error:", error);
    return NextResponse.json({ error: "No se pudo revisar el stock. Intenta otra vez." }, { status: 503 });
  }
}
