import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { MAX_PRODUCT_IMAGES, storeProductImage } from "@/lib/product-image-storage";

export async function POST(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  try {
    const productId = Number((await params).id);
    if (!Number.isInteger(productId)) return NextResponse.json({ error: "Producto inválido" }, { status: 400 });

    const producto = await prisma.product.findUnique({ where: { id: productId }, select: { slug: true, nombre: true } });
    if (!producto) return NextResponse.json({ error: "Producto no encontrado" }, { status: 404 });

    if (!req.headers.get("content-type")?.includes("multipart/form-data")) {
      return NextResponse.json({ error: "Envía las imágenes como formulario multipart." }, { status: 400 });
    }
    const formData = await req.formData();
    const files = [...formData.getAll("files"), ...formData.getAll("file")]
      .filter((value): value is File => value instanceof File && value.size > 0);
    if (files.length === 0) return NextResponse.json({ error: "No se enviaron imágenes" }, { status: 400 });

    const existentes = await prisma.productImage.count({ where: { productId } });
    const disponibles = MAX_PRODUCT_IMAGES - existentes;
    if (disponibles <= 0 || files.length > disponibles) {
      return NextResponse.json({ error: `Puedes guardar hasta ${MAX_PRODUCT_IMAGES} imágenes por producto. Quedan ${Math.max(0, disponibles)} espacios.` }, { status: 400 });
    }

    const ultimo = await prisma.productImage.findFirst({ where: { productId }, orderBy: { orden: "desc" }, select: { orden: true } });
    const alt = String(formData.get("alt") ?? "").trim();
    const creadas = [];

    for (let index = 0; index < files.length; index += 1) {
      const stored = await storeProductImage(files[index], producto.slug);
      const principal = existentes === 0 && index === 0;
      const imagen = await prisma.productImage.create({
        data: {
          ...stored,
          alt: alt || `${producto.nombre} - imagen ${existentes + index + 1}`,
          orden: (ultimo?.orden ?? -1) + index + 1,
          principal,
          productId,
        },
      });
      creadas.push(imagen);
      if (principal) await prisma.product.update({ where: { id: productId }, data: { imagen: stored.url } });
    }

    return NextResponse.json({ ok: true, imagen: creadas[0], imagenes: creadas }, { status: 201 });
  } catch (error) {
    console.error("POST upload imagen error:", error);
    return NextResponse.json({ error: error instanceof Error ? error.message : "No se pudieron guardar las imágenes" }, { status: 500 });
  }
}
