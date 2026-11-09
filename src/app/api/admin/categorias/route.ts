import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { prisma } from "@/lib/prisma";
import { slugUnico } from "@/lib/slug";

const CategorySchema = z.object({
  nombre: z.string().trim().min(2).max(100),
  descripcion: z.string().trim().max(1000).optional().default(""),
  icono: z.string().trim().max(20).optional().default("🏷️"),
  orden: z.number().int().min(0).max(999).optional().default(0),
});

export async function GET() {
  const categorias = await prisma.category.findMany({
    orderBy: [{ orden: "asc" }, { nombre: "asc" }],
    include: { _count: { select: { products: true } } },
  });
  return NextResponse.json({ categorias });
}

export async function POST(request: NextRequest) {
  try {
    const parsed = CategorySchema.safeParse(await request.json());
    if (!parsed.success) {
      return NextResponse.json({ error: "Revisa los datos de la categoría" }, { status: 400 });
    }
    const slug = await slugUnico(parsed.data.nombre, async (candidate) =>
      Boolean(await prisma.category.findUnique({ where: { slug: candidate }, select: { id: true } })),
    );
    const categoria = await prisma.category.create({
      data: { ...parsed.data, slug },
      include: { _count: { select: { products: true } } },
    });
    return NextResponse.json({ categoria }, { status: 201 });
  } catch (error) {
    console.error("POST /api/admin/categorias error:", error);
    return NextResponse.json({ error: "No se pudo crear la categoría" }, { status: 500 });
  }
}
