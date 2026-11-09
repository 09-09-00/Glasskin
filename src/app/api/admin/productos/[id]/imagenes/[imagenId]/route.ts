import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { deleteStoredProductImage, storeProductImage } from "@/lib/product-image-storage";
import { z } from "zod";

const UpdateSchema = z.object({
  alt: z.string().max(180).optional(),
  orden: z.number().int().min(0).optional(),
  principal: z.boolean().optional(),
});

export async function PATCH(req: NextRequest, { params }: { params: Promise<{ id: string; imagenId: string }> }) {
  try {
    const values = await params;
    const productId = Number(values.id);
    const imageId = Number(values.imagenId);
    const actual = await prisma.productImage.findFirst({
      where: { id: imageId, productId },
      include: { product: { select: { slug: true, nombre: true } } },
    });
    if (!actual) return NextResponse.json({ error: "Imagen no encontrada" }, { status: 404 });

    if (req.headers.get("content-type")?.includes("multipart/form-data")) {
      const formData = await req.formData();
      const file = formData.get("file");
      if (!(file instanceof File) || file.size === 0) return NextResponse.json({ error: "No se envió una imagen" }, { status: 400 });
      const stored = await storeProductImage(file, actual.product.slug);
      const nueva = await prisma.productImage.update({
        where: { id: imageId },
        data: { ...stored, alt: String(formData.get("alt") ?? actual.alt ?? actual.product.nombre) },
      });
      if (actual.principal) await prisma.product.update({ where: { id: productId }, data: { imagen: stored.url } });
      await deleteStoredProductImage(actual.url);
      return NextResponse.json({ ok: true, imagen: nueva });
    }

    const parsed = UpdateSchema.safeParse(await req.json());
    if (!parsed.success) return NextResponse.json({ error: "Datos inválidos", errores: parsed.error.flatten() }, { status: 400 });

    const imagen = await prisma.$transaction(async (tx) => {
      if (parsed.data.principal) await tx.productImage.updateMany({ where: { productId, NOT: { id: imageId } }, data: { principal: false } });
      const updated = await tx.productImage.update({ where: { id: imageId }, data: parsed.data });
      if (parsed.data.principal) await tx.product.update({ where: { id: productId }, data: { imagen: updated.url } });
      return updated;
    });

    return NextResponse.json({ ok: true, imagen });
  } catch (error) {
    console.error("PATCH imagen error:", error);
    return NextResponse.json({ error: "No se pudo actualizar la imagen" }, { status: 500 });
  }
}

export async function DELETE(_req: NextRequest, { params }: { params: Promise<{ id: string; imagenId: string }> }) {
  try {
    const values = await params;
    const productId = Number(values.id);
    const imageId = Number(values.imagenId);
    const actual = await prisma.productImage.findFirst({ where: { id: imageId, productId } });
    if (!actual) return NextResponse.json({ error: "Imagen no encontrada" }, { status: 404 });

    const siguiente = actual.principal
      ? await prisma.productImage.findFirst({ where: { productId, NOT: { id: imageId } }, orderBy: { orden: "asc" } })
      : null;

    await prisma.$transaction(async (tx) => {
      await tx.productImage.delete({ where: { id: imageId } });
      if (siguiente) await tx.productImage.update({ where: { id: siguiente.id }, data: { principal: true } });
      if (actual.principal) await tx.product.update({ where: { id: productId }, data: { imagen: siguiente?.url ?? null } });
    });
    await deleteStoredProductImage(actual.url);
    return NextResponse.json({ ok: true });
  } catch (error) {
    console.error("DELETE imagen error:", error);
    return NextResponse.json({ error: "No se pudo borrar la imagen" }, { status: 500 });
  }
}
