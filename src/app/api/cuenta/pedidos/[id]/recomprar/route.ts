import { NextRequest, NextResponse } from "next/server";
import { CUSTOMER_COOKIE, verificarSesionCliente } from "@/lib/customer-auth";
import { prisma } from "@/lib/prisma";

export const runtime = "nodejs";

export async function POST(request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const accountId = await verificarSesionCliente(request.cookies.get(CUSTOMER_COOKIE)?.value);
  if (!accountId) return NextResponse.json({ error: "Inicia sesión para repetir un pedido" }, { status: 401 });

  const { id } = await params;
  const pedidoId = Number(id);
  if (!Number.isInteger(pedidoId) || pedidoId < 1) return NextResponse.json({ error: "Pedido inválido" }, { status: 400 });

  try {
    const pedido = await prisma.order.findFirst({
      where: { id: pedidoId, accountId },
      select: {
        numero: true,
        items: {
          select: {
            cantidad: true,
            producto: {
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
        },
      },
    });
    if (!pedido) return NextResponse.json({ error: "No encontramos ese pedido en tu cuenta" }, { status: 404 });

    const productos = pedido.items.flatMap(({ cantidad, producto }) => producto.activo && producto.stock > 0
      ? [{ id: producto.id, slug: producto.slug, nombre: producto.nombre, marca: producto.brand.nombre, precio: producto.precio, imagen: producto.imagen, stock: producto.stock, cantidad: Math.min(cantidad, producto.stock) }]
      : []);
    const faltantes = pedido.items.flatMap(({ cantidad, producto }) => {
      if (!producto.activo || producto.stock <= 0) return [{ id: producto.id, nombre: producto.nombre, cantidadNoDisponible: cantidad }];
      if (producto.stock < cantidad) return [{ id: producto.id, nombre: producto.nombre, cantidadNoDisponible: cantidad - producto.stock }];
      return [];
    });
    return NextResponse.json({ ok: true, numero: pedido.numero, productos, faltantes });
  } catch (error) {
    console.error("POST /api/cuenta/pedidos/[id]/recomprar error:", error);
    return NextResponse.json({ error: "No se pudo revisar el stock de ese pedido. Intenta otra vez." }, { status: 503 });
  }
}
