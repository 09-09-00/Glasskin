import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { prisma } from "@/lib/prisma";

const UpdateSchema = z.object({
  nombre: z.string().trim().min(2).max(100),
  descripcion: z.string().trim().max(1000).optional().default(""),
  icono: z.string().trim().max(20).optional().default("🏷️"),
  orden: z.number().int().min(0).max(999),
});

export async function PATCH(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  const id = Number((await params).id);
  if (!Number.isInteger(id)) return NextResponse.json({ error: "ID inválido" }, { status: 400 });
  try {
    const parsed = UpdateSchema.safeParse(await request.json());
    if (!parsed.success) return NextResponse.json({ error: "Datos inválidos" }, { status: 400 });
    const categoria = await prisma.category.update({
      where: { id },
      data: parsed.data,
      include: { _count: { select: { products: true } } },
    });
    return NextResponse.json({ categoria });
  } catch (error) {
    console.error("PATCH /api/admin/categorias/[id] error:", error);
    return NextResponse.json({ error: "No se pudo actualizar la categoría" }, { status: 500 });
  }
}

export async function DELETE(
  _request: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  const id = Number((await params).id);
  if (!Number.isInteger(id)) return NextResponse.json({ error: "ID inválido" }, { status: 400 });
  try {
    const productos = await prisma.product.count({ where: { categoryId: id } });
    if (productos > 0) {
      return NextResponse.json(
        { error: `No se puede eliminar: contiene ${productos} producto${productos === 1 ? "" : "s"}` },
        { status: 409 },
      );
    }
    await prisma.category.delete({ where: { id } });
    return NextResponse.json({ ok: true });
  } catch (error) {
    console.error("DELETE /api/admin/categorias/[id] error:", error);
    return NextResponse.json({ error: "No se pudo eliminar la categoría" }, { status: 500 });
  }
}
