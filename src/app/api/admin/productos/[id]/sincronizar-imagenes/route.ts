// ============================================================
//  POST /api/admin/productos/[id]/sincronizar-imagenes
//  Escanea public/productos/<slug>/ y asocia imágenes encontradas
// ============================================================
import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import fs from "node:fs";
import path from "node:path";

const EXTENSIONES_VALIDAS = [".jpg", ".jpeg", ".png", ".webp", ".avif"];

export async function POST(
  _req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const producto = await prisma.product.findUnique({
      where: { id: Number(id) },
      select: { slug: true },
    });
    if (!producto) return NextResponse.json({ error: "Producto no encontrado" }, { status: 404 });

    const carpeta = path.join(process.cwd(), "public", "productos", producto.slug);
    if (!fs.existsSync(carpeta)) {
      return NextResponse.json({ agregadas: 0, imagenes: [], mensaje: "Carpeta no existe" });
    }

    const archivos = fs.readdirSync(carpeta)
      .filter((f) => EXTENSIONES_VALIDAS.includes(path.extname(f).toLowerCase()))
      .sort();

    if (archivos.length === 0) {
      return NextResponse.json({ agregadas: 0, imagenes: [], mensaje: "No hay imágenes válidas" });
    }

    // Obtener imágenes existentes para saber el siguiente orden
    const existentes = await prisma.productImage.findMany({
      where: { productId: Number(id) },
      orderBy: { orden: "desc" },
      take: 1,
    });
    let siguienteOrden = (existentes[0]?.orden ?? -1) + 1;

    const nuevasImagenes = [];
    for (const archivo of archivos) {
      const url = `/productos/${producto.slug}/${archivo}`;
      // Verificar si ya existe
      const existe = await prisma.productImage.findFirst({
        where: { productId: Number(id), url },
      });
      if (existe) continue;

      const esPrimera = (await prisma.productImage.count({ where: { productId: Number(id) } })) === 0;
      const imagen = await prisma.productImage.create({
        data: {
          url,
          alt: archivo.replace(/\.[^.]+$/, ""),
          orden: siguienteOrden++,
          principal: esPrimera,
          productId: Number(id),
        },
      });
      nuevasImagenes.push(imagen);
    }

    const todas = await prisma.productImage.findMany({
      where: { productId: Number(id) },
      orderBy: [{ principal: "desc" }, { orden: "asc" }],
    });

    if (todas[0]) {
      await prisma.product.update({ where: { id: Number(id) }, data: { imagen: todas[0].url } });
    }

    return NextResponse.json({ agregadas: nuevasImagenes.length, imagenes: todas });
  } catch (e) {
    console.error("POST sincronizar-imagenes error:", e);
    return NextResponse.json({ error: "Error interno" }, { status: 500 });
  }
}
