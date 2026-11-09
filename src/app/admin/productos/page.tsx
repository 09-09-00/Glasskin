// ============================================================
//  Panel admin - Lista de productos (Server Component)
// ============================================================
import { prisma } from "@/lib/prisma";

export const dynamic = "force-dynamic";
import { ProductosClient } from "./ProductosClient";

export default async function ProductosPage({ searchParams }: { searchParams: Promise<{ categoria?: string }> }) {
  const { categoria: slugCategoria } = await searchParams;
  const categoria = slugCategoria
    ? await prisma.category.findUnique({ where: { slug: slugCategoria }, select: { id: true, nombre: true } })
    : null;
  const [productos, categorias, marcas] = await Promise.all([
    prisma.product.findMany({
      where: categoria ? { categoryId: categoria.id } : undefined,
      orderBy: { createdAt: "desc" },
      include: {
        brand: true,
        category: true,
        imagenes: { orderBy: [{ principal: "desc" }, { orden: "asc" }] },
      },
    }),
    prisma.category.findMany({ orderBy: [{ orden: "asc" }, { nombre: "asc" }] }),
    prisma.brand.findMany({ orderBy: { nombre: "asc" } }),
  ]);
  return <ProductosClient initialProductos={productos} categorias={categorias} marcas={marcas} categoriaInicial={categoria?.nombre ?? null} />;
}
