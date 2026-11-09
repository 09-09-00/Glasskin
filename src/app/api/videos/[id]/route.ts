// ============================================================
//  API Video individual - GET, PATCH, DELETE
// ============================================================
import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { z } from "zod";

const UpdateSchema = z.object({
  titulo: z.string().min(3).max(200).optional(),
  url: z.string().url().optional(),
  descripcion: z.string().optional(),
  tema: z.string().optional(),
  productId: z.number().int().positive().nullable().optional(),
  brandId: z.number().int().positive().nullable().optional(),
});

export async function GET(
  _req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const video = await prisma.video.findUnique({
      where: { id: Number(id) },
      include: { producto: { include: { brand: true } }, brand: true },
    });
    if (!video) return NextResponse.json({ error: "Video no encontrado" }, { status: 404 });
    return NextResponse.json({ video });
  } catch (e) {
    console.error("GET /api/videos/[id] error:", e);
    return NextResponse.json({ error: "Error interno" }, { status: 500 });
  }
}

export async function PATCH(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const body = await req.json();
    const parsed = UpdateSchema.safeParse(body);
    if (!parsed.success) {
      return NextResponse.json({ error: "Datos inválidos", errores: parsed.error.flatten() }, { status: 400 });
    }

    if (parsed.data.productId !== undefined && parsed.data.productId !== null) {
      const prod = await prisma.product.findUnique({ where: { id: parsed.data.productId } });
      if (!prod) return NextResponse.json({ error: "Producto no encontrado" }, { status: 404 });
    }
    if (parsed.data.brandId !== undefined && parsed.data.brandId !== null) {
      const brand = await prisma.brand.findUnique({ where: { id: parsed.data.brandId } });
      if (!brand) return NextResponse.json({ error: "Marca no encontrada" }, { status: 404 });
    }

    const video = await prisma.video.update({
      where: { id: Number(id) },
      data: parsed.data,
      include: { producto: { include: { brand: true } }, brand: true },
    });

    return NextResponse.json({ ok: true, video });
  } catch (e) {
    console.error("PATCH /api/videos/[id] error:", e);
    return NextResponse.json({ error: "Error interno" }, { status: 500 });
  }
}

export async function DELETE(
  _req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    await prisma.video.delete({ where: { id: Number(id) } });
    return NextResponse.json({ ok: true });
  } catch (e) {
    console.error("DELETE /api/videos/[id] error:", e);
    return NextResponse.json({ error: "Error interno" }, { status: 500 });
  }
}