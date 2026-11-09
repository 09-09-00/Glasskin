// ============================================================
//  API PATCH /api/admin/productos/[id] - Editar stock y estado
//  (usado por el panel admin)
// ============================================================
import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { z } from "zod";

const UpdateSchema = z.object({
  nombre: z.string().trim().min(2).max(180).optional(),
  descripcion: z.string().trim().min(5).max(5000).optional(),
  modoUso: z.string().trim().min(3).max(3000).optional(),
  precio: z.number().min(0).max(1_000_000).optional(),
  stock: z.number().int().min(0).max(999_999).optional(),
  categoryId: z.number().int().positive().optional(),
  brandId: z.number().int().positive().optional(),
  imagen: z.string().trim().max(2000).optional(),
  activo: z.boolean().optional(),
}).refine((value) => Object.keys(value).length > 0, "Sin cambios");

const includeProduct = {
  brand: true,
  category: true,
  imagenes: { orderBy: [{ principal: "desc" as const }, { orden: "asc" as const }] },
};

export async function PATCH(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params;
  try {
    const body = await req.json();
    const parsed = UpdateSchema.safeParse(body);
    if (!parsed.success) {
      return NextResponse.json({ error: "Datos inválidos" }, { status: 400 });
    }
    const productId = Number(id);
    const { imagen, ...cambios } = parsed.data;
    const producto = await prisma.$transaction(async (tx) => {
      if (imagen) {
        await tx.productImage.updateMany({ where: { productId }, data: { principal: false } });
        const existente = await tx.productImage.findFirst({ where: { productId, url: imagen } });
        if (existente) {
          await tx.productImage.update({ where: { id: existente.id }, data: { principal: true } });
        } else {
          await tx.productImage.create({
            data: { productId, url: imagen, alt: cambios.nombre, principal: true, orden: 0 },
          });
        }
      }
      return tx.product.update({
        where: { id: productId },
        data: { ...cambios, ...(imagen ? { imagen } : {}) },
        include: includeProduct,
      });
    });
    return NextResponse.json({ ok: true, producto });
  } catch (e) {
    console.error("PATCH /api/admin/productos/[id] error:", e);
    return NextResponse.json({ error: "Error al actualizar" }, { status: 500 });
  }
}

export async function DELETE(
  _req: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  const productId = Number((await params).id);
  if (!Number.isInteger(productId)) {
    return NextResponse.json({ error: "ID inválido" }, { status: 400 });
  }
  try {
    const [pedidos, suscripciones] = await Promise.all([
      prisma.orderItem.count({ where: { productId } }),
      prisma.subscription.count({ where: { productId } }),
    ]);
    if (pedidos || suscripciones) {
      return NextResponse.json(
        { error: "No se puede eliminar porque tiene pedidos o suscripciones. Puedes desactivarlo." },
        { status: 409 },
      );
    }
    await prisma.product.delete({ where: { id: productId } });
    return NextResponse.json({ ok: true });
  } catch (error) {
    console.error("DELETE /api/admin/productos/[id] error:", error);
    return NextResponse.json({ error: "No se pudo eliminar el producto" }, { status: 500 });
  }
}
