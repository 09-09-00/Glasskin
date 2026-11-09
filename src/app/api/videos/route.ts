// ============================================================
//  API Videos - GET lista con filtros, POST crear
// ============================================================
import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { z } from "zod";

const VideoSchema = z.object({
  titulo: z.string().min(3).max(200),
  url: z.string().url(),
  descripcion: z.string().optional(),
  tema: z.string().optional(),
  productId: z.number().int().positive().optional(),
  brandId: z.number().int().positive().optional(),
});

export async function GET(req: NextRequest) {
  try {
    const { searchParams } = new URL(req.url);
    const q = searchParams.get("q") ?? undefined;
    const producto = searchParams.get("producto") ?? undefined;
    const marca = searchParams.get("marca") ?? undefined;
    const tema = searchParams.get("tema") ?? undefined;
    const categoria = searchParams.get("categoria") ?? undefined;

    const where: Record<string, unknown> = {};
    if (q) {
      where.OR = [
        { titulo: { contains: q } },
        { descripcion: { contains: q } },
      ];
    }
    if (producto) where.productId = Number(producto);
    if (marca) where.brandId = Number(marca);
    if (tema) where.tema = { contains: tema };
    if (categoria) {
      where.producto = { category: { slug: categoria } };
    }

    const videos = await prisma.video.findMany({
      where,
      orderBy: { createdAt: "desc" },
      include: {
        producto: { include: { brand: true } },
        brand: true,
      },
    });

    return NextResponse.json({ videos });
  } catch (e) {
    console.error("GET /api/videos error:", e);
    return NextResponse.json({ error: "Error interno" }, { status: 500 });
  }
}

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const parsed = VideoSchema.safeParse(body);
    if (!parsed.success) {
      return NextResponse.json({ error: "Datos inválidos", errores: parsed.error.flatten() }, { status: 400 });
    }

    // Validar que el producto/marca existan si se proporcionan
    if (parsed.data.productId) {
      const prod = await prisma.product.findUnique({ where: { id: parsed.data.productId } });
      if (!prod) return NextResponse.json({ error: "Producto no encontrado" }, { status: 404 });
    }
    if (parsed.data.brandId) {
      const brand = await prisma.brand.findUnique({ where: { id: parsed.data.brandId } });
      if (!brand) return NextResponse.json({ error: "Marca no encontrada" }, { status: 404 });
    }

    const video = await prisma.video.create({
      data: parsed.data,
      include: { producto: { include: { brand: true } }, brand: true },
    });

    return NextResponse.json({ ok: true, video }, { status: 201 });
  } catch (e) {
    console.error("POST /api/videos error:", e);
    return NextResponse.json({ error: "Error interno" }, { status: 500 });
  }
}