import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { prisma } from "@/lib/prisma";

const BodySchema = z.object({
  ids: z.array(z.number().int().positive()).min(1).max(20),
  presupuestoMax: z.number().positive().max(1000).optional(),
}).superRefine(({ ids }, context) => {
  if (new Set(ids).size !== ids.length) context.addIssue({ code: "custom", path: ["ids"], message: "La selección contiene productos repetidos." });
});

export async function POST(request: NextRequest) {
  const parsed = BodySchema.safeParse(await request.json().catch(() => null));
  if (!parsed.success) return NextResponse.json({ error: "Selección de productos inválida" }, { status: 400 });

  try {
    const productos = await prisma.product.findMany({
      where: { id: { in: parsed.data.ids }, activo: true, stock: { gt: 0 } },
      select: { id: true, slug: true, nombre: true, precio: true, imagen: true, stock: true, brand: { select: { nombre: true } } },
    });
    const ordenados = parsed.data.ids.flatMap((id) => {
      const producto = productos.find((item) => item.id === id);
      return producto ? [{ id: producto.id, slug: producto.slug, nombre: producto.nombre, marca: producto.brand.nombre, precio: producto.precio, imagen: producto.imagen, stock: producto.stock }] : [];
    });
    const total = Math.round(ordenados.reduce((sum, producto) => sum + producto.precio, 0) * 100) / 100;
    const presupuestoCambiado = parsed.data.presupuestoMax !== undefined && total > parsed.data.presupuestoMax;
    return NextResponse.json({ ok: true, productos: ordenados, total, noDisponibles: parsed.data.ids.length - ordenados.length, presupuestoCambiado });
  } catch (error) {
    console.error("POST /api/carrito/validar error:", error);
    return NextResponse.json({ error: "No se pudo verificar el stock ahora. Intenta otra vez." }, { status: 503 });
  }
}
