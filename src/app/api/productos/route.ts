// ============================================================
//  API GET /api/productos - Catálogo para la IA (FASE 2)
//  Devuelve productos filtrados en formato JSON plano
// ============================================================
import { NextRequest, NextResponse } from "next/server";
import { imagenPrincipalProducto, obtenerProductosParaAPI } from "@/lib/productos";

export async function GET(req: NextRequest) {
  const { searchParams } = new URL(req.url);

  // Mismos filtros que la página del catálogo
  const filtros = {
    q: searchParams.get("q") ?? undefined,
    marca: searchParams.get("marca") ?? undefined,
    categoria: searchParams.get("categoria") ?? undefined,
    piel: searchParams.get("piel") ?? undefined,
    preocupacion: searchParams.get("preocupacion") ?? undefined,
    orden: searchParams.get("orden") ?? undefined,
    precioMax: (() => {
      const v = searchParams.get("precioMax");
      if (!v) return undefined;
      const n = Number(v);
      return Number.isFinite(n) && n > 0 ? n : undefined;
    })(),
  };

  const productos = await obtenerProductosParaAPI(filtros);

  // Respuesta ligera: solo lo que la IA necesita para recomendar
  const data = productos.map((p) => ({
    id: p.id,
    slug: p.slug,
    nombre: p.nombre,
    marca: p.brand.nombre,
    categoria: p.category.slug,
    descripcion: p.descripcion,
    precio: p.precio,
    stock: p.stock,
    tipoPiel: JSON.parse(p.tipoPiel ?? "[]"),
    preocupaciones: JSON.parse(p.preocupaciones ?? "[]"),
    modoUso: p.modoUso,
    ingredientes: p.ingredientes.map((i) => i.ingrediente.nombre),
    imagen: imagenPrincipalProducto(p).url,
  }));

  return NextResponse.json({ total: data.length, productos: data });
}
