import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

const POR_PAGINA = 24;

export async function GET(request: NextRequest, { params }: { params: Promise<{ slug: string }> }) {
  const slug = (await params).slug;
  const producto = await prisma.product.findFirst({ where: { slug, activo: true }, select: { id: true } });
  if (!producto) return NextResponse.json({ error: "Producto no disponible." }, { status: 404 });
  const parametros = request.nextUrl.searchParams;
  const ordenParametro = parametros.get("orden");
  const orden = ordenParametro === "mejores" || ordenParametro === "peores" ? ordenParametro : "recientes";
  const pagina = Math.min(100, Math.max(0, Number.parseInt(parametros.get("pagina") ?? "0", 10) || 0));
  try {
    const [reseñas, total] = await Promise.all([
      prisma.productReview.findMany({
        where: { productId: producto.id, estado: "visible" },
        orderBy: orden === "mejores" ? [{ rating: "desc" }, { createdAt: "desc" }, { id: "desc" }] : orden === "peores" ? [{ rating: "asc" }, { createdAt: "desc" }, { id: "desc" }] : [{ createdAt: "desc" }, { id: "desc" }],
        skip: pagina * POR_PAGINA,
        take: POR_PAGINA,
        select: { id: true, rating: true, comment: true, createdAt: true, customer: { select: { nombre: true } } },
      }),
      prisma.productReview.count({ where: { productId: producto.id, estado: "visible" } }),
    ]);
    return NextResponse.json({ reseñas: reseñas.map((resena) => ({ id: resena.id, rating: resena.rating, comment: resena.comment, nombre: resena.customer.nombre.trim().split(/\s+/)[0] || "Cliente Glasskin", createdAt: resena.createdAt.toISOString() })), total, pagina, hayMas: (pagina + 1) * POR_PAGINA < total });
  } catch (error) {
    console.error("GET /api/productos/[slug]/resenas error:", error);
    return NextResponse.json({ error: "No se pudieron cargar las reseñas." }, { status: 503 });
  }
}
