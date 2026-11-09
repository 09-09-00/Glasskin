// ============================================================
//  API Imágenes de producto - GET lista, POST subir
// ============================================================
import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { z } from "zod";

const ImagenSchema = z.object({
  url: z.string().url(),
  alt: z.string().optional(),
  orden: z.number().int().min(0).optional(),
  principal: z.boolean().optional(),
});

export async function GET(
  _req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const imagenes = await prisma.productImage.findMany({
      where: { productId: Number(id) },
      orderBy: [{ principal: "desc" }, { orden: "asc" }],
    });
    return NextResponse.json({ imagenes });
  } catch (e) {
    console.error("GET imagenes error:", e);
    return NextResponse.json({ error: "Error interno" }, { status: 500 });
  }
}

export async function POST(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const body = await req.json();
    const parsed = ImagenSchema.safeParse(body);
    if (!parsed.success) {
      return NextResponse.json({ error: "Datos inválidos", errores: parsed.error.flatten() }, { status: 400 });
    }

    // Si es principal, quitar principal de las demás
    if (parsed.data.principal) {
      await prisma.productImage.updateMany({
        where: { productId: Number(id) },
        data: { principal: false },
      });
    }

    const imagen = await prisma.productImage.create({
      data: {
        ...parsed.data,
        productId: Number(id),
      },
    });

    if (imagen.principal) {
      await prisma.product.update({ where: { id: Number(id) }, data: { imagen: imagen.url } });
    }

    return NextResponse.json({ ok: true, imagen }, { status: 201 });
  } catch (e) {
    console.error("POST imagenes error:", e);
    return NextResponse.json({ error: "Error interno" }, { status: 500 });
  }
}
