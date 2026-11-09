import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { prisma } from "@/lib/prisma";
import { slugUnico } from "@/lib/slug";

const ImageSchema = z
  .string()
  .trim()
  .max(2000)
  .refine((value) => !value || value.startsWith("/") || URL.canParse(value), "Imagen inválida");

const ProductSchema = z.object({
  nombre: z.string().trim().min(2).max(180),
  descripcion: z.string().trim().min(5).max(5000),
  modoUso: z.string().trim().min(3).max(3000),
  precio: z.number().min(0).max(1_000_000),
  stock: z.number().int().min(0).max(999_999),
  categoryId: z.number().int().positive(),
  brandId: z.number().int().positive(),
  imagen: ImageSchema.optional().default(""),
  activo: z.boolean().optional().default(true),
});

const includeProduct = {
  brand: true,
  category: true,
  imagenes: { orderBy: [{ principal: "desc" as const }, { orden: "asc" as const }] },
};

export async function POST(request: NextRequest) {
  try {
    const parsed = ProductSchema.safeParse(await request.json());
    if (!parsed.success) {
      return NextResponse.json({ error: "Revisa los datos del producto" }, { status: 400 });
    }
    const { imagen, ...data } = parsed.data;
    const [brand, category] = await Promise.all([
      prisma.brand.findUnique({ where: { id: data.brandId }, select: { id: true } }),
      prisma.category.findUnique({ where: { id: data.categoryId }, select: { id: true } }),
    ]);
    if (!brand || !category) {
      return NextResponse.json({ error: "Marca o categoría inexistente" }, { status: 400 });
    }
    const slug = await slugUnico(data.nombre, async (candidate) =>
      Boolean(await prisma.product.findUnique({ where: { slug: candidate }, select: { id: true } })),
    );
    const producto = await prisma.product.create({
      data: {
        ...data,
        slug,
        imagen: imagen || null,
        ...(imagen
          ? { imagenes: { create: { url: imagen, alt: data.nombre, principal: true, orden: 0 } } }
          : {}),
      },
      include: includeProduct,
    });
    return NextResponse.json({ producto }, { status: 201 });
  } catch (error) {
    console.error("POST /api/admin/productos error:", error);
    return NextResponse.json({ error: "No se pudo crear el producto" }, { status: 500 });
  }
}
