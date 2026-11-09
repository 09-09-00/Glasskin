// ============================================================
//  Página de marca - Lista de productos de una marca
// ============================================================
import Link from "next/link";
import { notFound } from "next/navigation";
import { prisma } from "@/lib/prisma";
import { imagenPrincipalProducto, obtenerCalificacionesProductos, obtenerProductosConFiltros } from "@/lib/productos";
import { TarjetaProducto } from "@/components/TarjetaProducto";

interface Props {
  params: Promise<{ slug: string }>;
  searchParams: Promise<{ categoria?: string }>;
}

export default async function MarcaPage({ params, searchParams }: Props) {
  const { slug } = await params;
  const { categoria } = await searchParams;

  const marca = await prisma.brand.findUnique({
    where: { slug },
  });

  if (!marca) notFound();

  const [productos, categorias] = await Promise.all([
    obtenerProductosConFiltros({ marca: slug, categoria }),
    prisma.category.findMany({
      orderBy: { orden: "asc" },
      select: { slug: true, nombre: true, icono: true },
    }),
  ]);
  const calificaciones = await obtenerCalificacionesProductos(productos.map((producto) => producto.id));

  return (
    <div className="mx-auto max-w-6xl px-4 py-10">
      {/* Header de la marca */}
      <header className="mb-8">
        <Link href="/catalogo" className="text-sm font-medium text-[#3f806e] hover:text-[#2c5e50]">
          ← Volver al catálogo
        </Link>
        <h1 className="font-display mt-2 text-3xl font-bold text-stone-900 sm:text-4xl">
          {marca.nombre}
        </h1>
        {marca.descripcion && (
          <p className="mt-3 text-stone-600 max-w-2xl">{marca.descripcion}</p>
        )}
        <p className="mt-2 text-sm text-stone-500">
          {productos.length} producto{productos.length === 1 ? "" : "s"} de esta marca
        </p>
      </header>

      <div className="grid gap-8 lg:grid-cols-[260px_1fr]">
        {/* Filtros por categoría */}
        <aside>
          <h2 className="font-semibold text-stone-900 mb-3">Categorías</h2>
          <ul className="space-y-1">
            <li>
              <Link
                href={`/marca/${marca.slug}`}
                className={`block rounded-xl px-4 py-2.5 text-sm font-medium transition ${
                  !categoria ? "bg-[#fbf8f1] text-[#2c5e50]" : "text-stone-700 hover:bg-stone-50"
                }`}
              >
                Todas
              </Link>
            </li>
            {categorias.map((cat) => (
              <li key={cat.slug}>
                <Link
                  href={`/marca/${marca.slug}?categoria=${cat.slug}`}
                  className={`block rounded-xl px-4 py-2.5 text-sm font-medium transition ${
                    categoria === cat.slug ? "bg-[#fbf8f1] text-[#2c5e50]" : "text-stone-700 hover:bg-stone-50"
                  }`}
                >
                  <span className="mr-2">{cat.icono}</span>
                  {cat.nombre}
                </Link>
              </li>
            ))}
          </ul>
        </aside>

        {/* Resultados */}
        <div>
          {productos.length === 0 ? (
            <div className="rounded-2xl border border-dashed border-stone-300 bg-white p-12 text-center">
              <span className="text-4xl">🔍</span>
              <p className="mt-4 font-semibold text-stone-900">No hay productos en esta marca</p>
              <p className="mt-1 text-sm text-stone-500">Prueba seleccionando otra categoría.</p>
            </div>
          ) : (
            <div className="grid grid-cols-2 gap-4 sm:grid-cols-3 xl:grid-cols-4">
              {productos.map((producto) => {
                const foto = imagenPrincipalProducto(producto);
                return <TarjetaProducto
                  key={producto.id}
                  producto={{
                    id: producto.id,
                    slug: producto.slug,
                    nombre: producto.nombre,
                    precio: producto.precio,
                    stock: producto.stock,
                    imagen: foto.url,
                    blurDataUrl: foto.blurDataUrl,
                    brand: { nombre: producto.brand.nombre },
                    rating: calificaciones[producto.id],
                  }}
                />;
              })}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
